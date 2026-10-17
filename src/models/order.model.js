import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
        },
        name: {
          type: String,
          required: true,
        },
        thumbnail: {
          type: String,
        },
        price: {
          type: Number,
          required: true,
        },
        salePrice: {
          type: Number,
          required: true,
        },
        qty: {
          type: Number,
          required: true,
          min: 1,
          default: 1,
        },
      },
    ],
    shippingAddress: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pinCode: { type: String, required: true },
    },
    shippingMethod: {
      method: { type: String, default: "Standard Delivery" },
      cost: { type: Number, default: 0 },
    },
    payment: {
      method: { type: String, default: "Credit / Debit Card" },
      status: {
        type: String,
        enum: ["pending", "completed", "failed"],
        default: "completed",
      },
      transactionId: { type: String },
    },
    subtotal: {
      type: Number,
      required: true,
    },
    discount: {
      type: Number,
      default: 0,
    },
    shippingCost: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Processing", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    statusHistory: [
      {
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const OrderModel = mongoose.model("Order", orderSchema);
export default OrderModel;
