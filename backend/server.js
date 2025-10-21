// server.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

// ===== Middleware =====
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ===== MongoDB Connection =====
mongoose.connect(
  'mongodb+srv://akhil:lostandfound@cluster0.m9krqk8.mongodb.net/lost-and-found',
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.log('❌ DB connection error:', err));

// ===== Multer Setup =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// ===== Nodemailer Setup =====
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',      // replace with your Gmail
    pass: 'your-app-password'          // Gmail App Password
  }
});

transporter.verify(function(error, success) {
  if (error) console.error('❌ Email transporter error:', error);
  else console.log('✅ Email transporter ready');
});

// ===== Email Template Function =====
async function sendEmail(to, subject, item) {
  try {
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; background-color: #f3f4f6; margin:0; padding:0; }
        .container { max-width:600px; margin:20px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);}
        .header { background-color: #4f46e5; color: white; padding:20px; text-align:center;}
        .header h1 { margin:0; font-size:24px;}
        .content { padding:20px; color:#333; }
        .content h2 { color:#111827; margin-top:0; }
        .item-image { width:100%; max-width:300px; border-radius:8px; margin:15px 0; }
        .details p { margin:5px 0; }
        .button { display:inline-block; padding:12px 20px; background-color:#4f46e5; color:white; text-decoration:none; border-radius:8px; margin-top:15px; font-weight:bold;}
        .footer { font-size:12px; color:#888; text-align:center; padding:15px;}
        @media only screen and (max-width:600px) { .container { width:95%; } .button { width:100%; text-align:center; } }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>QISCET ReclaimHub</h1></div>
        <div class="content">
          <p>Hello,</p>
          <p>A new <strong>${item.itemType}</strong> item has been posted!</p>
          <h2>${item.Item_Name}</h2>
          <p>${item.Description}</p>
          ${item.upload_photo ? `<img src="http://localhost:5000${item.upload_photo}" alt="Item Image" class="item-image">` : ''}
          <div class="details">
            <p><strong>Location:</strong> ${item.Location_lost || item.Location_found || 'N/A'}</p>
            <p><strong>Date:</strong> ${item.Date_lost || item.Date_found || 'N/A'}</p>
          </div>
          <a href="http://localhost:3000/${item.itemType.toLowerCase()}.html" class="button">View Item</a>
        </div>
        <div class="footer">You are receiving this email because you are registered on QISCET ReclaimHub.</div>
      </div>
    </body>
    </html>
    `;

    await transporter.sendMail({
      from: '"QISCET ReclaimHub" <your-email@gmail.com>',
      to,
      subject,
      html: htmlContent
    });

    console.log(`📧 Email sent to ${to}`);
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}`, err);
  }
}

// ===== Schemas =====
const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },
  lastLogin: Date
});

const lostSchema = new mongoose.Schema({
  Item_Name: String,
  category: String,
  Description: String,
  Date_lost: Date,
  Location_lost: String,
  upload_photo: String,
  reportedBy: String,
  contactNo: String,
  email: String,
  status: { type: String, default: "Available" }
}, { timestamps: true });

const foundSchema = new mongoose.Schema({
  Item_Name: String,
  category: String,
  Description: String,
  Date_found: Date,
  Location_found: String,
  upload_photo: String,
  reportedBy: String,
  contactNo: String,
  email: String,
  status: { type: String, default: "Available" }
}, { timestamps: true });

const claimedItemSchema = new mongoose.Schema({
  itemId: String,
  itemName: String,
  itemType: String,
  claimedBy: String,
  userEmail: String,
  claimDate: { type: Date, default: Date.now },
  status: { type: String, default: "Claimed" },
  category: String,
  Description: String,
  contactNo: String,
  upload_photo: String,
  Date_lost: Date,
  Location_lost: String,
  Date_found: Date,
  Location_found: String
});

const User = mongoose.model('User', userSchema);
const Lost = mongoose.model('Lost', lostSchema);
const Found = mongoose.model('Found', foundSchema);
const ClaimedItem = mongoose.model('ClaimedItem', claimedItemSchema);

// ===== Routes =====

// Register
app.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });
    const newUser = new User({ fullName, email, password });
    await newUser.save();
    res.json({ success: true, message: "User registered successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.password !== password) return res.status(400).json({ message: "Invalid password" });
    user.lastLogin = new Date();
    await user.save();
    res.json({ success: true, message: "Login successful", user });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// Default Admin
async function createDefaultAdmin() {
  const existingAdmin = await User.findOne({ email: "admin@qiscet.com" });
  if (!existingAdmin) {
    await User.create({
      fullName: "System Admin",
      email: "admin@qiscet.com",
      password: "admin123",
      role: "admin"
    });
  }
}
createDefaultAdmin();

// ===== Lost Items =====
app.post('/lost/add', upload.single('itemPhoto'), async (req, res) => {
  const { Item_Name, category, Description, Date_lost, Location_lost, reportedBy, contactNo, email } = req.body;
  try {
    const newLost = new Lost({
      Item_Name,
      category,
      Description,
      Date_lost,
      Location_lost,
      reportedBy: reportedBy || "Anonymous",
      contactNo,
      email,
      upload_photo: req.file ? `/uploads/${req.file.filename}` : null
    });
    await newLost.save();

    // Send notifications to all users
    const users = await User.find({}, 'email');
    const itemData = { ...newLost.toObject(), itemType: "Lost" };
    await Promise.all(users.map(user => sendEmail(user.email, `New Lost Item: ${Item_Name}`, itemData)));

    res.json({ success: true, message: "Lost item added and notifications sent!" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// ===== Found Items =====
app.post('/found/add', upload.single('upload_photo'), async (req, res) => {
  const { Item_Name, category, Description, Date_found, Location_found, reportedBy, contactNo, email } = req.body;
  try {
    const newFound = new Found({
      Item_Name,
      category,
      Description,
      Date_found,
      Location_found,
      reportedBy: reportedBy || "Anonymous",
      contactNo,
      email,
      upload_photo: req.file ? `/uploads/${req.file.filename}` : null
    });
    await newFound.save();

    // Send notifications to all users
    const users = await User.find({}, 'email');
    const itemData = { ...newFound.toObject(), itemType: "Found" };
    await Promise.all(users.map(user => sendEmail(user.email, `New Found Item: ${Item_Name}`, itemData)));

    res.json({ success: true, message: "Found item added and notifications sent!" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// ===== Claims =====
app.post("/lost/claim/:id", async (req, res) => {
  const { claimerName, claimerEmail } = req.body;
  try {
    const item = await Lost.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    const claim = new ClaimedItem({
      itemId: item._id,
      itemName: item.Item_Name,
      itemType: "Lost",
      claimedBy: claimerName,
      userEmail: claimerEmail,
      claimDate: new Date(),
      status: "Claimed",
      category: item.category,
      Description: item.Description,
      contactNo: item.contactNo,
      upload_photo: item.upload_photo,
      Date_lost: item.Date_lost,
      Location_lost: item.Location_lost
    });
    await claim.save();
    await Lost.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Lost item claimed successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

app.post("/found/claim/:id", async (req, res) => {
  const { claimerName, claimerEmail } = req.body;
  try {
    const item = await Found.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    const claim = new ClaimedItem({
      itemId: item._id,
      itemName: item.Item_Name,
      itemType: "Found",
      claimedBy: claimerName,
      userEmail: claimerEmail,
      claimDate: new Date(),
      status: "Claimed",
      category: item.category,
      Description: item.Description,
      contactNo: item.contactNo,
      upload_photo: item.upload_photo,
      Date_found: item.Date_found,
      Location_found: item.Location_found
    });
    await claim.save();
    await Found.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Found item claimed successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// ===== Start Server =====
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
