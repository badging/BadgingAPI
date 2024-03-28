const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100000000, // 100MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.(xls|xlsx|csv)$/)) {
      return cb(new Error("Only supported files are allowed"));
    }
    cb(null, true);
  },
});

module.exports = upload;
