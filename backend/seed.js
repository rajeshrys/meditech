const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
console.log("MONGODB_URI =", process.env.MONGODB_URI);

// ✅ MongoDB Connection (updated for Atlas)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected for Seeding...'))
.catch(err => console.log('❌ MongoDB Error:', err));

// ==================== SCHEMAS ====================
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
  role: String,
  createdAt: { type: Date, default: Date.now }
});

const patientSchema = new mongoose.Schema({
  name: String,
  age: Number,
  gender: String,
  phone: String,
  email: String,
  address: String,
  createdAt: { type: Date, default: Date.now }
});

const doctorSchema = new mongoose.Schema({
  name: String,
  specialization: String,
  phone: String,
  email: String,
  createdAt: { type: Date, default: Date.now }
});

const appointmentSchema = new mongoose.Schema({
  patientName: String,
  doctorName: String,
  date: String,
  time: String,
  status: String,
  createdAt: { type: Date, default: Date.now }
});

const reportSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
  title: String,
  doctorName: String,
  date: String,
  status: String,
  fileUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Patient = mongoose.model('Patient', patientSchema);
const Doctor = mongoose.model('Doctor', doctorSchema);
const Appointment = mongoose.model('Appointment', appointmentSchema);
const Report = mongoose.model('Report', reportSchema);

// ==================== SEED FUNCTION ====================
async function seedDatabase() {
  try {
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Doctor.deleteMany({}),
      Appointment.deleteMany({}),
      Report.deleteMany({})
    ]);
    console.log('🧹 Cleared existing collections...');

    const hashedPassword = await bcrypt.hash('password123', 10);

    const users = await User.insertMany([
      { email: 'admin@hospital.com', password: hashedPassword, name: 'Admin User', role: 'admin' },
      { email: 'doctor@hospital.com', password: hashedPassword, name: 'Dr. Smith', role: 'doctor' },
      { email: 'reception@hospital.com', password: hashedPassword, name: 'Jane Reception', role: 'receptionist' },
      { email: 'patient@hospital.com', password: hashedPassword, name: 'John Patient', role: 'patient' }
    ]);
    console.log('✅ Users seeded');

    const patients = await Patient.insertMany([
      { name: 'John Doe', age: 45, gender: 'Male', phone: '123-456-7890', email: 'john@email.com', address: '123 Main St' },
      { name: 'Jane Smith', age: 32, gender: 'Female', phone: '098-765-4321', email: 'jane@email.com', address: '456 Oak Ave' },
      { name: 'Bob Johnson', age: 58, gender: 'Male', phone: '555-123-4567', email: 'bob@email.com', address: '789 Pine Rd' },
      { name: 'Alice Williams', age: 28, gender: 'Female', phone: '555-987-6543', email: 'alice@email.com', address: '321 Elm St' },
      { name: 'Charlie Brown', age: 65, gender: 'Male', phone: '555-246-8135', email: 'charlie@email.com', address: '654 Maple Dr' }
    ]);
    console.log('✅ Patients seeded');

    await Doctor.insertMany([
      { name: 'Dr. Sarah Smith', specialization: 'Cardiology', phone: '111-222-3333', email: 'sarah@hospital.com' },
      { name: 'Dr. Michael Brown', specialization: 'Neurology', phone: '444-555-6666', email: 'michael@hospital.com' },
      { name: 'Dr. Emily Davis', specialization: 'Pediatrics', phone: '777-888-9999', email: 'emily@hospital.com' },
      { name: 'Dr. James Wilson', specialization: 'Orthopedics', phone: '222-333-4444', email: 'james@hospital.com' },
      { name: 'Dr. Lisa Anderson', specialization: 'Dermatology', phone: '555-666-7777', email: 'lisa@hospital.com' }
    ]);
    console.log('✅ Doctors seeded');

    await Appointment.insertMany([
      { patientName: 'John Doe', doctorName: 'Dr. Sarah Smith', date: '2025-10-26', time: '10:00 AM', status: 'Scheduled' },
      { patientName: 'Jane Smith', doctorName: 'Dr. Michael Brown', date: '2025-10-27', time: '02:00 PM', status: 'Completed' },
      { patientName: 'Bob Johnson', doctorName: 'Dr. Emily Davis', date: '2025-10-28', time: '11:30 AM', status: 'Scheduled' },
      { patientName: 'Alice Williams', doctorName: 'Dr. James Wilson', date: '2025-10-29', time: '09:00 AM', status: 'Cancelled' },
      { patientName: 'Charlie Brown', doctorName: 'Dr. Lisa Anderson', date: '2025-10-30', time: '03:00 PM', status: 'Scheduled' }
    ]);
    console.log('✅ Appointments seeded');

    await Report.insertMany([
      { patientId: patients[0]._id, title: 'Blood Test Results', doctorName: 'Dr. Sarah Smith', date: '2025-10-20', status: 'Available', fileUrl: '/reports/bloodtest-john.pdf' },
      { patientId: patients[1]._id, title: 'MRI Scan', doctorName: 'Dr. Michael Brown', date: '2025-10-18', status: 'Available', fileUrl: '/reports/mri-jane.pdf' },
      { patientId: patients[2]._id, title: 'General Checkup', doctorName: 'Dr. Emily Davis', date: '2025-10-22', status: 'Pending', fileUrl: '' },
      { patientId: patients[3]._id, title: 'Bone X-Ray', doctorName: 'Dr. James Wilson', date: '2025-10-19', status: 'Available', fileUrl: '/reports/xray-alice.pdf' },
      { patientId: patients[4]._id, title: 'Skin Allergy Report', doctorName: 'Dr. Lisa Anderson', date: '2025-10-23', status: 'Pending', fileUrl: '' }
    ]);
    console.log('✅ Reports seeded');

    console.log('\n🎉 All data seeded successfully!');
    console.log('You can now login with:');
    console.log('Email: admin@hospital.com | Password: password123');

    await mongoose.connection.close(); // ✅ Proper close
    console.log('🔒 Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

seedDatabase();
