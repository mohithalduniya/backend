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

// CREATE CATEGORY
// GET ALL CATEGORIES
export const read = async (req, res) => {
  try {
    const query = req.query;
    let queryfilter = {};
    let limit = query.limit ? Number(query.limit) : 0;
    if (query.status) {
      queryfilter.status = query.status === "true";
    }
    if (query.featured) {
      queryfilter.featured = query.featured === "true";
    }
    if (query.bestSeller) {
      queryfilter.bestSeller = query.bestSeller === "true";
    }
    if (query.newArrival) {
      queryfilter.newArrival = query.newArrival === "true";
    }
    if (query.stock) {
      queryfilter.stock = query.stock === "true";
    }

    if (query.category) {
      const categoryNames = Array.isArray(query.category)
        ? query.category
        : [query.category];
      const categories = await CategoryModel.find({
        name: { $in: categoryNames },
      });
      const categoryIds = categories.map((c) => c._id);
      if (categoryIds.length > 0) {
        queryfilter.categoryId = { $in: categoryIds };
      } else {
        queryfilter.categoryId = null; // Forces empty result if category not found
      }
    }

    if (query.room) {
      const roomNames = Array.isArray(query.room) ? query.room : [query.room];
      const rooms = await RoomModel.find({ name: { $in: roomNames } });
      const roomIds = rooms.map((r) => r._id);
      if (roomIds.length > 0) {
        queryfilter.roomId = { $in: roomIds };
      } else {
        queryfilter.roomId = null;
      }
    }

    // console.log(queryfilter);
    const product = await ProductModel.find(queryfilter)
      .populate("categoryId")
      .limit(limit);

    return res.status(200).json({
      message: "Product data found",
      success: true,
      product,
    });
  } catch (error) {
    return sendServerError(res, error);
  }
};

// GET CATEGORY BY ID
export const readById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, "Invalid product ID");
    }

    const product = await ProductModel.findById(id).populate("categoryId");

    if (!product) {
      return sendNotFound(res, "Category not found");
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

// DELETE CATEGORY
export const deleteById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
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

// UPDATE CATEGORY STATUS
export const status = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res, "Invalid product ID");
    }

    const product = await ProductModel.findById(id);

    if (!product) {
      return sendNotFound(res, "Proudtc not found");
    }

    await ProductModel.findByIdAndUpdate(
      id,
      {
        $set: {
          status: !product.status,
        },
      },
      {
        new: true,
      },
    );

    return sendSuccess(res, "Product status updated successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const update = async (req, res) => {
  try {
    const { id } = req.params;
    const imageUrl = req.file?.path ?? null;

    // Validate ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendBadRequest(res);
    }

    // Check product exists
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
      status,
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
      const duplicateProduct = await ProductModel.findOne({
        $or: [...(name ? [{ name }] : []), ...(slug ? [{ slug }] : [])],
        _id: { $ne: id },
      });

      if (duplicateProduct) {
        return sendConflict(res);
      }
    }

    // Update fields
    if (name) product.name = name;
    if (slug) product.slug = slug;
    if (shortDescription !== undefined)
      product.shortDescription = shortDescription;
    if (description) product.description = description;
    if (categoryId) product.categoryId = categoryId;
    if (roomId) product.roomId = roomId;
    if (price) product.price = price;
    if (salePrice !== undefined) product.salePrice = salePrice;
    if (discount !== undefined) product.discount = discount;
    if (stock !== undefined) product.stock = stock === "true" || stock === true;
    if (material) product.material = material;
    if (color !== undefined) product.color = color;
    if (status !== undefined)
      product.status = status === "true" || status === true;
    if (featured !== undefined)
      product.featured = featured === "true" || featured === true;
    if (bestSeller !== undefined)
      product.bestSeller = bestSeller === "true" || bestSeller === true;
    if (newArrival !== undefined)
      product.newArrival = newArrival === "true" || newArrival === true;

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

    return sendSuccess(res, "product updated successfully");
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const create = async (req, res) => {
  try {
    // console.log(req.body);

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
      status,
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
      return sendBadRequest(res, "Missing required fields");
    }

    if (!imageUrl) {
      return sendBadRequest(res, "Thumbnail image is required");
    }

    // console.log(req.body);

    const product = await ProductModel.findOne({ slug });

    if (product) return sendConflict(res);

    await ProductModel.create({
      name,
      slug,
      shortDescription,
      description,
      categoryId,
      roomId,
      price,
      salePrice,
      discount,
      stock: stock === "true" || stock === true,
      material,
      color,
      status: status === "true" || status === true,
      featured: featured === "true" || featured === true,
      bestSeller: bestSeller === "true" || bestSeller === true,
      newArrival: newArrival === "true" || newArrival === true,
      thumbnail: imageUrl,
      dimensions: {
        length: dimensions_length ? Number(dimensions_length) : undefined,
        width: dimensions_width ? Number(dimensions_width) : undefined,
        height: dimensions_height ? Number(dimensions_height) : undefined,
        unit: dimensions_unit || "cm",
      },
      weight: {
        value: weight_value ? Number(weight_value) : undefined,
        unit: weight_unit || "kg",
      }
    });

    sendCreated(res);
  } catch (error) {
    console.log(error);
    sendServerError(res, error);
  }
};

export const updateFlag = async (req, res) => {
  try {
    const { id } = req.params;
    const { field } = req.body;
    // console.log(id, field);
    const allowedFields = ["stock", "featured", "bestSeller", "newArrival"];

    if (!allowedFields.includes(field)) {
      return sendBadRequest(res, "Invalid field");
    }

    const product = await ProductModel.findById(id);

    if (!product) {
      return sendNotFound(res);
    }

    await ProductModel.updateOne(
      { _id: id },
      { $set: { [field]: !product[field] } },
    );

    return sendSuccess(res, `${field} updated successfully`);
  } catch (error) {
    sendServerError(res, error);
  }
};
