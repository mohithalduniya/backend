import OrderModel from "../models/order.model.js";
import UserModel from "../models/user.model.js";
import ProductModel from "../models/product.model.js";
import {
  sendBadRequest,
  sendNotFound,
  sendServerError,
  sendSuccess,
} from "../utils/response.js";

// Create a new order
export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      items,
      shippingAddress,
      shippingMethod,
      payment,
      discount = 0,
      shippingCost = 0,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendBadRequest(res, "Order must contain at least one product item.");
    }

    if (
      !shippingAddress ||
      !shippingAddress.fullName ||
      !shippingAddress.phone ||
      !shippingAddress.address ||
      !shippingAddress.city ||
      !shippingAddress.state ||
      !shippingAddress.pinCode
    ) {
      return sendBadRequest(
        res,
        "Complete shipping address (Full Name, Phone, Address, City, State, PIN) is required."
      );
    }

    // Prices, names and availability come from the database, never from the client.
    const productIds = items.map((item) => item.product || item.id || item._id);
    if (productIds.some((id) => !id || !/^[0-9a-fA-F]{24}$/.test(String(id)))) {
      return sendBadRequest(res, "Invalid product in order.");
    }

    const products = await ProductModel.find({ _id: { $in: productIds } });
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));

    let subtotal = 0;
    const formattedItems = [];
    for (const item of items) {
      const product = productMap.get(String(item.product || item.id || item._id));
      if (!product || product.status === false) {
        return sendBadRequest(res, "One of the products is no longer available.");
      }
      if (product.stock === false) {
        return sendBadRequest(res, `"${product.name}" is out of stock.`);
      }

      const qty = Math.min(Math.max(parseInt(item.qty, 10) || 1, 1), 99);
      const price = Number(product.price) || 0;
      const salePrice = Number(product.salePrice) || price;
      subtotal += salePrice * qty;

      formattedItems.push({
        product: product._id,
        name: product.name,
        thumbnail: product.thumbnail,
        price,
        salePrice,
        qty,
      });
    }

    // Discount can never exceed the subtotal; shipping can never be negative.
    const parsedDiscount = Math.min(Math.max(Number(discount) || 0, 0), subtotal);
    const parsedShippingCost = Math.max(Number(shippingCost) || 0, 0);
    const total = Math.max(0, subtotal - parsedDiscount + parsedShippingCost);

    // Unique Order ID: ORD-YYYYMMDD-XXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderId = `ORD-${dateStr}-${randomSuffix}`;

    const newOrder = await OrderModel.create({
      orderId,
      user: userId,
      items: formattedItems,
      shippingAddress: {
        fullName: shippingAddress.fullName.trim(),
        email: shippingAddress.email || req.user.email,
        phone: shippingAddress.phone.trim(),
        address: shippingAddress.address.trim(),
        city: shippingAddress.city.trim(),
        state: shippingAddress.state.trim(),
        pinCode: shippingAddress.pinCode.trim(),
      },
      shippingMethod: {
        method: shippingMethod?.method || "Standard Delivery",
        cost: parsedShippingCost,
      },
      payment: {
        method: payment?.method || "Credit / Debit Card",
        status: payment?.status || "completed",
        transactionId: payment?.transactionId || `TXN-${Date.now()}`,
      },
      subtotal,
      discount: parsedDiscount,
      shippingCost: parsedShippingCost,
      total,
      orderStatus: "Pending",
      statusHistory: [
        {
          status: "Pending",
          changedAt: new Date(),
          note: "Order placed successfully",
        },
      ],
    });

    // Optionally save the address into user's saved addresses
    try {
      const user = await UserModel.findById(userId);
      if (user && user.addresses) {
        const addressExists = user.addresses.some(
          (addr) =>
            addr.addressLine === shippingAddress.address &&
            addr.pincode === shippingAddress.pinCode
        );
        if (!addressExists) {
          user.addresses.push({
            fullName: shippingAddress.fullName,
            mobile: shippingAddress.phone,
            pincode: shippingAddress.pinCode,
            addressLine: shippingAddress.address,
            city: shippingAddress.city,
            state: shippingAddress.state,
            country: "India",
            isDefault: user.addresses.length === 0,
          });
          await user.save();
        }
      }
    } catch (saveAddrErr) {
      console.warn("Could not auto-save address to user profile:", saveAddrErr);
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully!",
      order: newOrder,
    });
  } catch (error) {
    console.error("Create Order Error:", error);
    return sendServerError(res, error);
  }
};

// Get current user's orders
export const getMyOrders = async (req, res) => {
  try {
    const orders = await OrderModel.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "My orders fetched successfully",
      count: orders.length,
      orders,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Get single order details
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await OrderModel.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { orderId: id }],
    }).populate("user", "name email mobile");

    if (!order) {
      return sendNotFound(res, "Order not found");
    }

    // Ensure customer owns the order or requester is admin
    const isOwner =
      order.user && order.user._id.toString() === req.user._id.toString();
    const isAdmin = ["admin", "superAdmin"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this order.",
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Admin: Get all orders
export const getAllOrders = async (req, res) => {
  try {
    const { status, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status) {
      filter.orderStatus = status;
    }

    const totalOrders = await OrderModel.countDocuments(filter);
    const orders = await OrderModel.find(filter)
      .populate("user", "name email mobile")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    return res.status(200).json({
      success: true,
      totalOrders,
      currentPage: Number(page),
      totalPages: Math.ceil(totalOrders / Number(limit)),
      orders,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    const validStatuses = [
      "Pending",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (!status || !validStatuses.includes(status)) {
      return sendBadRequest(
        res,
        `Status must be one of: ${validStatuses.join(", ")}`
      );
    }

    const order = await OrderModel.findById(id);
    if (!order) {
      return sendNotFound(res, "Order not found");
    }

    order.orderStatus = status;
    order.statusHistory.push({
      status,
      changedAt: new Date(),
      note: note || `Order status updated to ${status} by admin`,
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      order,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Admin: Get dashboard order statistics
export const getOrderStats = async (req, res) => {
  try {
    // Optional ?range=today|week|month limits every figure to that window.
    const rangeDays = { today: 1, week: 7, month: 30 }[
      String(req.query.range || "").toLowerCase()
    ];
    const dateFilter = {};
    if (rangeDays) {
      const since = new Date();
      if (rangeDays === 1) since.setHours(0, 0, 0, 0);
      else since.setTime(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
      dateFilter.createdAt = { $gte: since };
    }

    const [
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
    ] = await Promise.all([
      OrderModel.countDocuments(dateFilter),
      OrderModel.countDocuments({ ...dateFilter, orderStatus: "Pending" }),
      OrderModel.countDocuments({ ...dateFilter, orderStatus: "Processing" }),
      OrderModel.countDocuments({ ...dateFilter, orderStatus: "Shipped" }),
      OrderModel.countDocuments({ ...dateFilter, orderStatus: "Delivered" }),
    ]);

    // Revenue calculation (excluding cancelled orders)
    const revenueAgg = await OrderModel.aggregate([
      { $match: { ...dateFilter, orderStatus: { $ne: "Cancelled" } } },
      { $group: { _id: null, totalRevenue: { $sum: "$total" } } },
    ]);
    const totalRevenue =
      revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

    // Best selling products (excluding cancelled orders)
    const topProductsAgg = await OrderModel.aggregate([
      { $match: { ...dateFilter, orderStatus: { $ne: "Cancelled" } } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          name: { $first: "$items.name" },
          thumbnail: { $first: "$items.thumbnail" },
          sales: { $sum: "$items.qty" },
          revenue: {
            $sum: { $multiply: ["$items.salePrice", "$items.qty"] },
          },
        },
      },
      { $sort: { sales: -1, revenue: -1 } },
      { $limit: 4 },
    ]);
    const topProducts = topProductsAgg.map((p) => ({
      id: p._id,
      name: p.name,
      thumbnail: p.thumbnail,
      sales: p.sales,
      revenue: p.revenue,
    }));

    // Recent 5 orders
    const recentOrders = await OrderModel.find(dateFilter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .limit(5);

    const formattedRecentOrders = recentOrders.map((ord) => ({
      id: ord.orderId,
      _id: ord._id,
      customer: ord.shippingAddress?.fullName || ord.user?.name || "Customer",
      items: `${ord.items.length} ${ord.items.length === 1 ? "item" : "items"}`,
      price: `₹${ord.total.toLocaleString("en-IN")}`,
      rawPrice: ord.total,
      status: ord.orderStatus,
      time: new Date(ord.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: ord.createdAt,
    }));

    // Monthly revenue/orders for the last 12 calendar months (ignores the range filter)
    const trendStart = new Date();
    trendStart.setDate(1);
    trendStart.setHours(0, 0, 0, 0);
    trendStart.setMonth(trendStart.getMonth() - 11);

    const monthlyAgg = await OrderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: trendStart },
          orderStatus: { $ne: "Cancelled" },
        },
      },
      {
        $group: {
          _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
    ]);

    const monthlyTrend = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(trendStart.getFullYear(), trendStart.getMonth() + i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const hit = monthlyAgg.find((x) => x._id.y === year && x._id.m === month);
      monthlyTrend.push({
        label: d.toLocaleString("en-US", { month: "short" }),
        year,
        month,
        revenue: hit?.revenue || 0,
        orders: hit?.orders || 0,
      });
    }

    return res.status(200).json({
      success: true,
      stats: {
        totalOrders,
        totalRevenue,
        pendingOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
      },
      recentOrders: formattedRecentOrders,
      topProducts,
      monthlyTrend,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};
