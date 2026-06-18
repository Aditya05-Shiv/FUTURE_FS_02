import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (!adminEmail || !adminPassword || !process.env.JWT_SECRET) {
    return res.status(500).json({ message: 'Admin credentials are not configured' });
  }

  const emailMatches = email.toLowerCase() === adminEmail.toLowerCase();
  const passwordMatches = adminPassword.startsWith('$2')
    ? await bcrypt.compare(password, adminPassword)
    : password === adminPassword;

  if (!emailMatches || !passwordMatches) {
    return res.status(401).json({ message: 'Invalid admin credentials' });
  }

  const token = jwt.sign({ email: adminEmail, role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '8h'
  });

  return res.json({
    token,
    admin: {
      email: adminEmail
    }
  });
});

export default router;
