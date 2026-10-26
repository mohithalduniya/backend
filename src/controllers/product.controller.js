import mongoose from "mongoose";
import {
  sendBadRequest,
  sendConflict,
  sendCreated,
  sendNotFound,
  sendServerError,
  sendSuccess,
} from "../utils/response.js";
import ProductModel from "../models/product.model.js";
import CategoryModel from "../models/category.model.js";
import RoomModel from "../models/Room.model.js";


// GET ALL PRODUCTS
export const read = async (req, res) => {
  try {
    const query = req.query;
    let queryfilter = {};
    let limit = query.limit ? Number(query.limit) : 0;

    if (query.status !== undefined && query.status !== "") {
      queryfilter.status = query.status === "true" || query.status === true;
    }
    if (query.featured !== undefined && query.featured !== "") {
      queryfilter.featured = query.featured === "true" || query.featured === true;
    }
    if (query.bestSeller !== undefined && query.bestSeller !== "") {
      queryfilter.bestSeller = query.bestSeller === "true" || query.bestSeller === true;
    }
    if (query.newArrival !== undefined && query.newArrival !== "") {
      queryfilter.newArrival = query.newArrival === "true" || query.newArrival === true;
    }
    if (query.stock !== undefined && query.stock !== "") {
      queryfilter.stock = query.stock === "true" || query.stock === true;
    }

    // Keyword search across name, slug, shortDescription
    if (query.search && query.search.trim()) {
      const searchRegex = new RegExp(query.search.trim(), "i");
      queryfilter.$or = [
        { name: searchRegex },
        { slug: searchRegex },
        { shortDescription: searchRegex },
      ];
    }

    // Category filter by ObjectId, slug, or name
    if (query.category) {
      const catVal = query.category;
      if (typeof catVal === "string" && mongoose.Types.ObjectId.isValid(catVal)) {
        queryfilter.categoryId = catVal;
      } else {
        const categoryNames = Array.isArray(catVal) ? catVal : [catVal];
        const categories = await CategoryModel.find({
          $or: [
            { name: { $in: categoryNames } },
            { slug: { $in: categoryNames } },
          ],
        });
        const categoryIds = categories.map((c) => c._id);
        queryfilter.categoryId = categoryIds.length > 0 ? { $in: categoryIds } : null;
      }
    }

    // Room filter by ObjectId, slug, or name
    if (query.room) {
      const roomVal = query.room;
      if (typeof roomVal === "string" && mongoose.Types.ObjectId.isValid(roomVal)) {
        queryfilter.roomId = roomVal;
      } else {
        const roomNames = Array.isArray(roomVal) ? roomVal : [roomVal];
        const rooms = await RoomModel.find({
          $or: [
            { name: { $in: roomNames } },
            { slug: { $in: roomNames } },
          ],
        });
        const roomIds = rooms.map((r) => r._id);
        queryfilter.roomId = roomIds.length > 0 ? { $in: roomIds } : null;
      }
    }

    let queryBuilder = ProductModel.find(queryfilter)
      .populate("categoryId", "name slug image")
      .populate("roomId", "name slug image")
      .sort({ createdAt: -1 });

    if (limit > 0) {
      queryBuilder = queryBuilder.limit(limit);
    }

    const product = await queryBuilder;

    return res.status(200).json({
      message: "Product data found",
      success: true,
      count: product.length,
      product,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// GET PRODUCT BY ID
export const readById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, "Invalid product ID");
    }

    const product = await ProductModel.findById(id)
      .populate("categoryId", "name slug image")
      .populate("roomId", "name slug image");

    if (!product) {
      return sendNotFound(res, "Product not found");
    }

    return res.status(200).json({
      message: "Product data found",
      success: true,
      product,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// DELETE PRODUCT
export const deleteById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, "Invalid Product ID");
    }

    const product = await ProductModel.findById(id);

    if (!product) {
      return sendNotFound(res, "Product not found");
    }

    await ProductModel.findByIdAndDelete(id);

    return sendSuccess(res, "Product deleted successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
};

// UPDATE PRODUCT STATUS
export const status = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, "Invalid product ID");
    }

    const product = await ProductModel.findById(id);

    if (!product) {
      return sendNotFound(res, "Product not found");
    }

    product.status = !product.status;
    await product.save();

    return sendSuccess(
      res,
      `Product status changed to ${product.status ? "Active" : "Inactive"}`
    );
  } catch (error) {
    return sendServerError(res, error);
  }
};

// UPDATE PRODUCT
export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const imageUrl = req.file?.path ?? null;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, "Invalid product ID");
    }

    const product = await ProductModel.findById(id);

    if (!product) {
      return sendNotFound(res, "Product not found");
    }

    const {
      name,
      slug,
      shortDescription,
      description,
      categoryId,
      roomId,
      price,
      salePrice,
      discount,
      stock,
      material,
      color,
      status: productStatus,
      featured,
      bestSeller,
      newArrival,
      dimensions_length,
      dimensions_width,
      dimensions_height,
      dimensions_unit,
      weight_value,
      weight_unit,
    } = req.body;

    // Check duplicate name or slug if they are being updated
    if (name || slug) {
      const duplicateConditions = [];
      if (name && name.trim()) duplicateConditions.push({ name: name.trim() });
      if (slug && slug.trim()) duplicateConditions.push({ slug: slug.trim().toLowerCase() });

      if (duplicateConditions.length > 0) {
        const duplicateProduct = await ProductModel.findOne({
          $or: duplicateConditions,
          _id: { $ne: id },
        });

        if (duplicateProduct) {
          return sendConflict(res, "Product with this name or slug already exists");
        }
      }
    }

    // Update fields
    if (name && name.trim()) product.name = name.trim();
    if (slug && slug.trim()) product.slug = slug.trim().toLowerCase();
    if (shortDescription !== undefined) product.shortDescription = shortDescription;
    if (description !== undefined) product.description = description;
    if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
      product.categoryId = categoryId;
    }
    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
      product.roomId = roomId;
    }
    if (price !== undefined && price !== "") {
      const numPrice = Number(price);
      if (!isNaN(numPrice)) product.price = numPrice;
    }
    if (salePrice !== undefined && salePrice !== "") {
      const numSale = Number(salePrice);
      if (!isNaN(numSale)) product.salePrice = numSale;
    }
    if (discount !== undefined && discount !== "") {
      const numDisc = Number(discount);
      if (!isNaN(numDisc)) product.discount = numDisc;
    }
    if (stock !== undefined) {
      product.stock = stock === "true" || stock === true;
    }
    if (material) product.material = material;
    if (color !== undefined) product.color = color;
    if (productStatus !== undefined) {
      product.status = productStatus === "true" || productStatus === true;
    }
    if (featured !== undefined) {
      product.featured = featured === "true" || featured === true;
    }
    if (bestSeller !== undefined) {
      product.bestSeller = bestSeller === "true" || bestSeller === true;
    }
    if (newArrival !== undefined) {
      product.newArrival = newArrival === "true" || newArrival === true;
    }

    if (dimensions_length || dimensions_width || dimensions_height) {
      product.dimensions = {
        length: dimensions_length ? Number(dimensions_length) : undefined,
        width: dimensions_width ? Number(dimensions_width) : undefined,
        height: dimensions_height ? Number(dimensions_height) : undefined,
        unit: dimensions_unit || "cm",
      };
    }

    if (weight_value) {
      product.weight = {
        value: Number(weight_value),
        unit: weight_unit || "kg",
      };
    }

    // Update thumbnail if a new file was uploaded
    if (imageUrl) {
      product.thumbnail = imageUrl;
    }

    await product.save();

    return sendSuccess(res, "Product updated successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
};

// CREATE PRODUCT
export const create = async (req, res) => {
  try {
    const imageUrl = req.file?.path || "";

    const {
      name,
      slug,
      shortDescription,
      description,
      categoryId,
      roomId,
      price,
      salePrice,
      discount,
      stock,
      material,
      color,
      status: productStatus,
      featured,
      bestSeller,
      newArrival,
      dimensions_length,
      dimensions_width,
      dimensions_height,
      dimensions_unit,
      weight_value,
      weight_unit,
    } = req.body;

    if (!name || !slug || !description || !categoryId || !roomId || !price) {
      return sendBadRequest(res, "Missing required fields (name, slug, description, category, room, price)");
    }

    if (!imageUrl) {
      return sendBadRequest(res, "Thumbnail image is required");
    }

    const cleanName = name.trim();
    const cleanSlug = slug.trim().toLowerCase();

    const existingProduct = await ProductModel.findOne({
      $or: [{ name: cleanName }, { slug: cleanSlug }],
    });

    if (existingProduct) {
      return sendConflict(res, "Product with this name or slug already exists");
    }

    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice < 200) {
      return sendBadRequest(res, "Price must be at least ₹200");
    }

    const numSalePrice =
      salePrice && !isNaN(Number(salePrice)) ? Number(salePrice) : numPrice;
    const numDiscount =
      discount && !isNaN(Number(discount)) ? Number(discount) : 0;

    const newProduct = await ProductModel.create({
      name: cleanName,
      slug: cleanSlug,
      shortDescription: shortDescription || "",
      description,
      categoryId,
      roomId,
      price: numPrice,
      salePrice: numSalePrice,
      discount: numDiscount,
      stock: stock === "true" || stock === true || stock === undefined,
      material: material || "Wood",
      color: color || "",
      status: productStatus === "true" || productStatus === true || productStatus === undefined,
      featured: featured === "true" || featured === true,
      bestSeller: bestSeller === "true" || bestSeller === true,
      newArrival: newArrival === "true" || newArrival === true,
      thumbnail: imageUrl,
      dimensions: {
        length: dimensions_length && !isNaN(Number(dimensions_length)) ? Number(dimensions_length) : undefined,
        width: dimensions_width && !isNaN(Number(dimensions_width)) ? Number(dimensions_width) : undefined,
        height: dimensions_height && !isNaN(Number(dimensions_height)) ? Number(dimensions_height) : undefined,
        unit: dimensions_unit || "cm",
      },
      weight: {
        value: weight_value && !isNaN(Number(weight_value)) ? Number(weight_value) : undefined,
        unit: weight_unit || "kg",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// UPDATE QUICK FLAGS
export const updateFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { field } = req.body;

    const allowedFields = ["stock", "featured", "bestSeller", "newArrival"];

    if (!allowedFields.includes(field)) {
      return sendBadRequest(res, `Invalid field. Allowed: ${allowedFields.join(", ")}`);
    }

    const product = await ProductModel.findById(id);

    if (!product) {
      return sendNotFound(res, "Product not found");
    }

    product[field] = !product[field];
    await product.save();

    return sendSuccess(res, `${field} updated successfully`);
  } catch (error) {
    return sendServerError(res, error);
  }
};
