import express from "express";
import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("kirayo.db");

  // Initialize Database
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT,
      role TEXT,
      avatar TEXT,
      verified INTEGER DEFAULT 0,
      plan TEXT DEFAULT 'free',
      plan_expiry DATETIME
    );

    CREATE TABLE IF NOT EXISTS properties (
      id TEXT PRIMARY KEY,
      owner_id TEXT,
      title TEXT,
      description TEXT,
      category TEXT,
      sub_category TEXT,
      price INTEGER,
      deposit INTEGER,
      size TEXT,
      address TEXT,
      city TEXT,
      lat REAL,
      lng REAL,
      images TEXT,
      amenities TEXT,
      verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT,
      receiver_id TEXT,
      property_id TEXT,
      content TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      tenant_id TEXT,
      date TEXT,
      status TEXT DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      property_id TEXT,
      user_id TEXT,
      rating INTEGER,
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Initial Data
    INSERT OR IGNORE INTO users (id, name, email, role, avatar, verified)
    VALUES 
    ('owner1', 'Amit Kumar', 'amit@example.com', 'owner', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amit', 1),
    ('owner2', 'Suresh Singh', 'suresh@example.com', 'owner', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Suresh', 0),
    ('owner3', 'Priya Sharma', 'priya@example.com', 'owner', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', 1),
    ('user_1', 'Rahul Sharma', 'rahul@example.com', 'tenant', 'https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul', 0);

    INSERT OR IGNORE INTO properties (id, owner_id, title, description, category, sub_category, price, deposit, size, address, city, lat, lng, images, amenities, verified)
    VALUES 
    ('p1', 'owner1', 'Luxury 2BHK in Vijay Nagar', 'Spacious and airy apartment with modern amenities.', 'Residential', '2BHK', 15000, 30000, '1200 sqft', 'Vijay Nagar, Indore', 'Indore', 22.7533, 75.8937, '["https://picsum.photos/seed/house1/800/600"]', '["Parking", "Lift", "Security"]', 1),
    ('p2', 'owner2', 'Compact 1RK for Bachelors', 'Perfect for students or working professionals.', 'Residential', '1RK', 6000, 12000, '400 sqft', 'Bhawarkua, Indore', 'Indore', 22.6916, 75.8676, '["https://picsum.photos/seed/house2/800/600"]', '["WiFi", "Water 24/7"]', 0),
    ('p3', 'owner3', 'Prime Shop Space in MG Road', 'High visibility shop space for retail business.', 'Commercial', 'Shop', 45000, 100000, '800 sqft', 'MG Road, Delhi', 'Delhi', 28.6139, 77.2090, '["https://picsum.photos/seed/shop1/800/600"]', '["AC", "Power Backup"]', 1);
  `);

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(express.json());

  // API Routes
  app.get("/api/properties", (req, res) => {
    const properties = db.prepare(`
      SELECT p.*, u.verified as owner_verified 
      FROM properties p 
      LEFT JOIN users u ON p.owner_id = u.id 
      ORDER BY p.created_at DESC
    `).all();
    res.json(properties.map(p => ({ ...p, images: JSON.parse(p.images), amenities: JSON.parse(p.amenities) })));
  });

  app.post("/api/properties", (req, res) => {
    const { id, owner_id, title, description, category, sub_category, price, deposit, size, address, city, lat, lng, images, amenities } = req.body;
    
    // Check limit
    const user = db.prepare("SELECT plan FROM users WHERE id = ?").get(owner_id) as any;
    if (user && user.plan === 'free') {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const count = db.prepare(`
        SELECT COUNT(*) as count FROM properties 
        WHERE owner_id = ? AND created_at >= ?
      `).get(owner_id, startOfMonth.toISOString()) as any;
      
      if (count.count >= 3) {
        return res.status(403).json({ error: "Free limit khatam! Premium plan le lo for unlimited postings." });
      }
    }

    db.prepare(`
      INSERT INTO properties (id, owner_id, title, description, category, sub_category, price, deposit, size, address, city, lat, lng, images, amenities)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, owner_id, title, description, category, sub_category, price, deposit, size, address, city, lat, lng, JSON.stringify(images), JSON.stringify(amenities));
    res.json({ success: true });
  });

  app.get("/api/messages/:userId1/:userId2", (req, res) => {
    const { userId1, userId2 } = req.params;
    const messages = db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY timestamp ASC
    `).all(userId1, userId2, userId2, userId1);
    res.json(messages);
  });

  app.get("/api/users/:id", (req, res) => {
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Count listings this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const count = db.prepare(`
      SELECT COUNT(*) as count FROM properties 
      WHERE owner_id = ? AND created_at >= ?
    `).get(req.params.id, startOfMonth.toISOString());
    
    res.json({ ...user, listings_this_month: (count as any).count });
  });

  app.post("/api/users/upgrade", (req, res) => {
    const { userId, plan } = req.body;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    
    db.prepare("UPDATE users SET plan = ?, plan_expiry = ? WHERE id = ?")
      .run(plan, expiry.toISOString(), userId);
    
    res.json({ success: true });
  });

  app.post("/api/payments/verify", async (req, res) => {
    const { userId, plan, transactionId } = req.body;
    
    // In a direct UPI flow, we assume the user has paid and we verify manually or via a mock
    if (transactionId) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      
      db.prepare("UPDATE users SET plan = ?, plan_expiry = ? WHERE id = ?")
        .run(plan, expiry.toISOString(), userId);
        
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: "Transaction ID required" });
    }
  });

  app.post("/api/users/verify", (req, res) => {
    const { userId, verified } = req.body;
    db.prepare("UPDATE users SET verified = ? WHERE id = ?").run(verified ? 1 : 0, userId);
    res.json({ success: true });
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join(userId);
    });

    socket.on("send_message", (data) => {
      const { sender_id, receiver_id, content, property_id } = data;
      db.prepare("INSERT INTO messages (sender_id, receiver_id, content, property_id) VALUES (?, ?, ?, ?)").run(sender_id, receiver_id, content, property_id);
      io.to(receiver_id).emit("receive_message", data);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected");
    });
  });

  // Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
