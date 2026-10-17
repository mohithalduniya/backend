// success response
const sendSuccess = (res, message = "Success") => {
  return res.status(200).json({
    success: true,
    message
  });
};

// created response
const sendCreated = (res, message = "Created successfully") => {
  return res.status(201).json({
    success: true,
    message
  });
};


// bad request (validation errors)
const sendBadRequest = (res, message = "Bad request") => {
  return res.status(400).json({
    success: false,
    message
  });
};

// not found
const sendNotFound = (res, message = "Resource not found") => {
  return res.status(404).json({
    success: false,
    message
  });
};

// conflict (already exists)
const sendConflict = (res, message = "Data already exists") => {
  return res.status(409).json({
    success: false,
    message
  });
};

// server error
const sendServerError = (res, error) => {
  console.error(error);
  return res.status(500).json({
    success: false,
    message: error ? error.message : "Internal server error"
  });
};

export {
  sendSuccess,
  sendCreated,
  sendBadRequest,
  sendNotFound,
  sendConflict,
  sendServerError
};  