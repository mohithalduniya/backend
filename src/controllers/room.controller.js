import roomModel from "../models/Room.model.js";

// 1. Create a new room
export const createroom = async (req, res) => {
  try {
    const { name, slug, status } = req.body;
    const image = req.file ? req.file.path : undefined;
    // Convert status string to boolean if needed
    const statusBool =
      typeof status === "string"
        ? status.toLowerCase() === "active"
        : Boolean(status);

    if (!name || !slug) {
      return res.status(400).json({
        message: "Name and slug are required fields",
        success: false,
      });
    }

    // Check for duplicate name or slug
    const existingroom = await roomModel.findOne({
      $or: [{ name }, { slug }],
    });

    if (existingroom) {
      return res.status(400).json({
        message: "room with this name or slug already exists",
        success: false,
      });
    }

    const room = await roomModel.create({
      name,
      slug,
      image,
      status: statusBool,
    });

    return res.status(201).json({
      message: "room created successfully",
      success: true,
      data: room,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      success: false,
    });
  }
};

// 2. Fetch all categories
export const readroom = async (req, res) => {
  try {
    const query = req.query;
    let queryfilter = {};
    let limit = query.limit ? Number(query.limit) : 0;
    if (query.status) {
      queryfilter.status = query.status === "true";
    }
    const room = await roomModel.find(queryfilter).limit(limit);

    return res.status(200).json({
      message: "rooms fetched successfully",
      success: true,
      count: room.length,
      data: room,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      success: false,
    });
  }
};

// 3. Find single room by ID
export const readById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await roomModel.findById(id);

    if (!room) {
      return res.status(404).json({
        message: "room not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Single room fetched successfully",
      success: true,
      room,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      success: false,
    });
  }
};

// 4. Delete room by ID
export const deleteById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fixed method: findByIdAndDelete
    const room = await roomModel.findByIdAndDelete(id);

    if (!room) {
      return res.status(404).json({
        message: "room not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "room deleted successfully",
      success: true,
      room,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      success: false,
    });
  }
};

// 5. Update room by ID
export const updateById = async (req, res) => {
  try {
    const { id } = req.params;

    // Fixed: Passing req.body to update all fields and returning new document
    // Ensure status is boolean if provided as string
    const updateData = { ...req.body };
    if (typeof updateData.status === "string") {
      updateData.status = updateData.status.toLowerCase() === "active";
    }
    if (req.file) {
      updateData.image = req.file.path;
    }
    const updatedroom = await roomModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    );

    if (!updatedroom) {
      return res.status(404).json({
        message: "room not found",
        success: false,
      });
    }

    return res.status(200).json({
      message: "Data is updated successfully",
      success: true,
      room: updatedroom,
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message || "Internal server error",
      success: false,
    });
  }
};

// 6. Toggle room status
export const status = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await roomModel.findById(id);
    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }
    room.status = !room.status;
    await room.save();
    return res.status(200).json({
      success: true,
      message: "Room status updated successfully",
      room,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
