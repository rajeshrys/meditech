// ==================== IMPORTS ====================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors());
app.use(express.json());

// ==================== MONGODB CONNECTION ====================
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.log('❌ MongoDB Error:', err));

// ==================== MODELS ====================
// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['admin', 'doctor', 'receptionist', 'patient'], required: true },
  createdAt: { type: Date, default: Date.now },
});

// Patient Schema
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Doctor Schema
const doctorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  specialization: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Appointment Schema
const appointmentSchema = new mongoose.Schema({
  patientName: { type: String, required: true },
  doctorName: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  status: { type: String, enum: ['Scheduled', 'Completed', 'Cancelled'], default: 'Scheduled' },
  createdAt: { type: Date, default: Date.now },
});

// Report Schema
const reportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  title: { type: String, required: true },
  doctorName: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, enum: ['Available', 'Pending'], default: 'Pending' },
  fileUrl: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Models
const User = mongoose.model('User', userSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Report = mongoose.model('Report', reportSchema);

// ==================== AUTH MIDDLEWARE ====================
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'No token provided' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth Error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};

// ==================== AUTH ROUTES ====================
// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      name,
      role: role || 'patient',
    });
    await user.save();
    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn:  60 * 60 * 24 * 365  }
    );

    res.json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PATIENT ROUTES ====================
app.get('/api/patients', authMiddleware, authorize('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    const patients = await Patient.find().sort({ createdAt: -1 });
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/patients/:id', authMiddleware, async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/patients', authMiddleware, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const patient = new Patient(req.body);
    await patient.save();
    res.status(201).json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/patients/:id', authMiddleware, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    console.log('Updating Patient:', req.params.id, req.body);
    const patient = await Patient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/patients/:id', authMiddleware, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const patient = await Patient.findByIdAndDelete(req.params.id);
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DOCTOR ROUTES ====================
app.get('/api/doctors', authMiddleware, async (req, res) => {
  try {
    const doctors = await Doctor.find().sort({ createdAt: -1 });
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/doctors/:id', authMiddleware, async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/doctors', authMiddleware, authorize('admin'), async (req, res) => {
  try {
    const doctor = new Doctor(req.body);
    await doctor.save();
    res.status(201).json(doctor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Fixed Doctor Update Route
app.put('/api/doctors/:id', authMiddleware, authorize('admin'), async (req, res) => {
  try {
    console.log('Updating Doctor:', req.params.id, req.body);
    const doctor = await Doctor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json(doctor);
  } catch (error) {
    console.error('Doctor Update Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/doctors/:id', authMiddleware, authorize('admin'), async (req, res) => {
  try {
    const doctor = await Doctor.findByIdAndDelete(req.params.id);
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    res.json({ message: 'Doctor deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== APPOINTMENT ROUTES ====================
app.get('/api/appointments', authMiddleware, authorize('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/appointments/:id', authMiddleware, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/appointments', authMiddleware, authorize('admin', 'receptionist', 'patient'), async (req, res) => {
  try {
    const appointment = new Appointment(req.body);
    await appointment.save();
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Fixed Appointment Update Route
app.put('/api/appointments/:id', authMiddleware, authorize('admin', 'receptionist', 'doctor'), async (req, res) => {
  try {
    console.log('Updating Appointment:', req.params.id, req.body);
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json(appointment);
  } catch (error) {
    console.error('Appointment Update Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/appointments/:id', authMiddleware, authorize('admin', 'receptionist'), async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ message: 'Appointment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REPORT ROUTES ====================
app.get('/api/reports', authMiddleware, authorize('admin', 'doctor'), async (req, res) => {
  try {
    const reports = await Report.find().populate('patientId').sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/:id', authMiddleware, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('patientId');
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/reports/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const reports = await Report.find({ patientId: req.params.patientId }).populate('patientId').sort({ createdAt: -1 });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reports', authMiddleware, authorize('admin', 'doctor'), async (req, res) => {
  try {
    const report = new Report(req.body);
    await report.save();
    const populatedReport = await Report.findById(report._id).populate('patientId');
    res.status(201).json(populatedReport);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reports/:id', authMiddleware, authorize('admin', 'doctor'), async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('patientId');
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/reports/:id', authMiddleware, authorize('admin', 'doctor'), async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== DASHBOARD STATS ROUTE ====================
app.get('/api/stats', authMiddleware, authorize('admin'), async (req, res) => {
  try {
    const totalPatients = await Patient.countDocuments();
    const totalDoctors = await Doctor.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const scheduledAppointments = await Appointment.countDocuments({ status: 'Scheduled' });
    const completedAppointments = await Appointment.countDocuments({ status: 'Completed' });
    const cancelledAppointments = await Appointment.countDocuments({ status: 'Cancelled' });

    res.json({
      totalPatients,
      totalDoctors,
      totalAppointments,
      scheduledAppointments,
      completedAppointments,
      cancelledAppointments,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SERVER LISTEN ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

module.exports = app;
