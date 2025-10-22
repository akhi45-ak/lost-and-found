// server.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

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
    console.log("✅ Default admin created: admin@qiscet.com / admin123");
  }
}
createDefaultAdmin();

// ===== Lost Items (User) =====
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
    res.json({ success: true, message: "Lost item added successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

app.get('/lost', async (req, res) => {
  try {
    const items = await Lost.find({}).sort({ createdAt: -1 });
    res.json({ success: true, items: items || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error", items: [] });
  }
});

// ===== Found Items (User) =====
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
    res.json({ success: true, message: "Found item added successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

app.get('/found', async (req, res) => {
  try {
    const items = await Found.find({}).sort({ createdAt: -1 });
    res.json({ success: true, items: items || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error", items: [] });
  }
});

// ===== Claims (User/Admin) =====
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

// ===== Admin Routes =====
app.get('/admin/lostitems', async (req, res) => {
  try {
    const items = await Lost.find({}).sort({ createdAt: -1 });
    res.json({ success: true, items: items || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error", items: [] });
  }
});

app.get('/admin/founditems', async (req, res) => {
  try {
    const items = await Found.find({}).sort({ createdAt: -1 });
    res.json({ success: true, items: items || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error", items: [] });
  }
});

app.get('/admin/claimeditems', async (req, res) => {
  try {
    const items = await ClaimedItem.find({}).sort({ claimDate: -1 });
    res.json({ success: true, items: items || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error", items: [] });
  }
});

app.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ lastLogin: -1 });
    res.json({ success: true, users: users || [] });
  } catch (err) {
    res.status(500).json({ message: "Server error", users: [] });
  }
});

// DELETE Lost / Found items
app.delete('/admin/lost/:id', async (req, res) => {
  try {
    const item = await Lost.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ success: true, message: "Lost item deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

app.delete('/admin/found/:id', async (req, res) => {
  try {
    const item = await Found.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ success: true, message: "Found item deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", err });
  }
});

// ===== Start Server =====
const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
