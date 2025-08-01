import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';
import Database from 'sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database setup
const db = new Database.Database('timetable.db');

// Initialize database
function initDatabase() {
  const schema = `
    -- Users table for authentication
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'faculty', 'student')),
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Faculty table
    CREATE TABLE IF NOT EXISTS faculty (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Batch table
    CREATE TABLE IF NOT EXISTS batch (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      year INTEGER NOT NULL,
      semester INTEGER NOT NULL,
      student_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Subject table
    CREATE TABLE IF NOT EXISTS subject (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('theory', 'lab')),
      credits INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- SubjectBatch mapping
    CREATE TABLE IF NOT EXISTS subject_batch (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      batch_id INTEGER NOT NULL,
      faculty_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subject(id),
      FOREIGN KEY (batch_id) REFERENCES batch(id),
      FOREIGN KEY (faculty_id) REFERENCES faculty(id),
      UNIQUE(subject_id, batch_id)
    );

    -- Classroom table
    CREATE TABLE IF NOT EXISTS classroom (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      capacity INTEGER NOT NULL,
      type TEXT DEFAULT 'both' CHECK (type IN ('theory', 'lab', 'both')),
      building TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- TimeSlot table
    CREATE TABLE IF NOT EXISTS time_slot (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slot_number INTEGER UNIQUE NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      is_break BOOLEAN DEFAULT FALSE
    );

    -- Timetable table
    CREATE TABLE IF NOT EXISTS timetable (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      subject_id INTEGER NOT NULL,
      faculty_id INTEGER NOT NULL,
      classroom_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
      time_slot_id INTEGER NOT NULL,
      duration INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (batch_id) REFERENCES batch(id),
      FOREIGN KEY (subject_id) REFERENCES subject(id),
      FOREIGN KEY (faculty_id) REFERENCES faculty(id),
      FOREIGN KEY (classroom_id) REFERENCES classroom(id),
      FOREIGN KEY (time_slot_id) REFERENCES time_slot(id)
    );

    -- Insert default time slots
    INSERT OR IGNORE INTO time_slot (slot_number, start_time, end_time, is_break) VALUES
    (1, '10:45', '11:45', 0),
    (2, '11:45', '12:45', 0),
    (3, '12:45', '13:45', 0),
    (4, '14:15', '15:15', 0),
    (5, '15:15', '16:15', 0),
    (6, '16:15', '17:30', 0);

    -- Insert default admin user
    INSERT OR IGNORE INTO users (username, password, role, name) VALUES
    ('admin', '$2b$10$8K1p/a0dTLlAc8/vYrXUMOHsH9X7.7nQXrM/LF0XJJ8N0Zk0Zk0Zk', 'admin', 'System Administrator');
  `;

  db.exec(schema, (err) => {
    if (err) {
      console.error('Database initialization error:', err);
    } else {
      console.log('Database initialized successfully');
    }
  });
}

// Helper functions
function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon'
  };
  return mimeTypes[ext] || 'text/plain';
}

function sendJSON(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Authentication middleware
function requireAuth(req, res, role = null) {
  // In a real application, implement JWT or session-based auth
  // For demo purposes, we'll use a simple approach
  return true; // Simplified for demo
}

// API Routes
async function handleAPI(req, res, pathname) {
  const method = req.method;
  
  try {
    // Faculty routes
    if (pathname === '/api/faculty' && method === 'GET') {
      db.all('SELECT * FROM faculty ORDER BY name', (err, rows) => {
        if (err) return sendJSON(res, { error: err.message }, 500);
        sendJSON(res, rows);
      });
    }
    
    else if (pathname === '/api/faculty' && method === 'POST') {
      const body = await parseBody(req);
      const { name, email, phone, department } = body;
      
      db.run('INSERT INTO faculty (name, email, phone, department) VALUES (?, ?, ?, ?)',
        [name, email, phone, department], function(err) {
          if (err) return sendJSON(res, { error: err.message }, 500);
          sendJSON(res, { id: this.lastID, message: 'Faculty added successfully' });
        });
    }
    
    // Batch routes
    else if (pathname === '/api/batches' && method === 'GET') {
      db.all('SELECT * FROM batch ORDER BY name', (err, rows) => {
        if (err) return sendJSON(res, { error: err.message }, 500);
        sendJSON(res, rows);
      });
    }
    
    else if (pathname === '/api/batches' && method === 'POST') {
      const body = await parseBody(req);
      const { name, year, semester, student_count } = body;
      
      db.run('INSERT INTO batch (name, year, semester, student_count) VALUES (?, ?, ?, ?)',
        [name, year, semester, student_count], function(err) {
          if (err) return sendJSON(res, { error: err.message }, 500);
          sendJSON(res, { id: this.lastID, message: 'Batch added successfully' });
        });
    }
    
    // Subject routes
    else if (pathname === '/api/subjects' && method === 'GET') {
      db.all('SELECT * FROM subject ORDER BY name', (err, rows) => {
        if (err) return sendJSON(res, { error: err.message }, 500);
        sendJSON(res, rows);
      });
    }
    
    else if (pathname === '/api/subjects' && method === 'POST') {
      const body = await parseBody(req);
      const { name, code, type, credits } = body;
      
      db.run('INSERT INTO subject (name, code, type, credits) VALUES (?, ?, ?, ?)',
        [name, code, type, credits], function(err) {
          if (err) return sendJSON(res, { error: err.message }, 500);
          sendJSON(res, { id: this.lastID, message: 'Subject added successfully' });
        });
    }
    
    // Classroom routes
    else if (pathname === '/api/classrooms' && method === 'GET') {
      db.all('SELECT * FROM classroom ORDER BY name', (err, rows) => {
        if (err) return sendJSON(res, { error: err.message }, 500);
        sendJSON(res, rows);
      });
    }
    
    else if (pathname === '/api/classrooms' && method === 'POST') {
      const body = await parseBody(req);
      const { name, capacity, type, building } = body;
      
      db.run('INSERT INTO classroom (name, capacity, type, building) VALUES (?, ?, ?, ?)',
        [name, capacity, type, building], function(err) {
          if (err) return sendJSON(res, { error: err.message }, 500);
          sendJSON(res, { id: this.lastID, message: 'Classroom added successfully' });
        });
    }
    
    // Subject-Batch mapping routes
    else if (pathname === '/api/subject-batch' && method === 'GET') {
      const query = `
        SELECT sb.*, s.name as subject_name, s.code, s.type, 
               b.name as batch_name, f.name as faculty_name
        FROM subject_batch sb
        JOIN subject s ON sb.subject_id = s.id
        JOIN batch b ON sb.batch_id = b.id
        JOIN faculty f ON sb.faculty_id = f.id
        ORDER BY b.name, s.name
      `;
      
      db.all(query, (err, rows) => {
        if (err) return sendJSON(res, { error: err.message }, 500);
        sendJSON(res, rows);
      });
    }
    
    else if (pathname === '/api/subject-batch' && method === 'POST') {
      const body = await parseBody(req);
      const { subject_id, batch_id, faculty_id } = body;
      
      db.run('INSERT INTO subject_batch (subject_id, batch_id, faculty_id) VALUES (?, ?, ?)',
        [subject_id, batch_id, faculty_id], function(err) {
          if (err) return sendJSON(res, { error: err.message }, 500);
          sendJSON(res, { id: this.lastID, message: 'Subject-Batch mapping added successfully' });
        });
    }
    
    // Timetable generation
    else if (pathname === '/api/generate-timetable' && method === 'POST') {
      await generateTimetable();
      sendJSON(res, { message: 'Timetable generated successfully' });
    }
    
    // Get timetable data
    else if (pathname.startsWith('/api/timetable')) {
      const urlParams = new URL(req.url, `http://${req.headers.host}`);
      const batchId = urlParams.searchParams.get('batch_id');
      const facultyId = urlParams.searchParams.get('faculty_id');
      
      let query = `
        SELECT t.*, s.name as subject_name, s.code, s.type,
               b.name as batch_name, f.name as faculty_name,
               c.name as classroom_name, ts.start_time, ts.end_time,
               ts.slot_number
        FROM timetable t
        JOIN subject s ON t.subject_id = s.id
        JOIN batch b ON t.batch_id = b.id
        JOIN faculty f ON t.faculty_id = f.id
        JOIN classroom c ON t.classroom_id = c.id
        JOIN time_slot ts ON t.time_slot_id = ts.id
      `;
      
      const params = [];
      if (batchId) {
        query += ' WHERE t.batch_id = ?';
        params.push(batchId);
      } else if (facultyId) {
        query += ' WHERE t.faculty_id = ?';
        params.push(facultyId);
      }
      
      query += ' ORDER BY t.day_of_week, ts.slot_number';
      
      db.all(query, params, (err, rows) => {
        if (err) return sendJSON(res, { error: err.message }, 500);
        sendJSON(res, rows);
      });
    }
    
    else {
      sendJSON(res, { error: 'Not found' }, 404);
    }
    
  } catch (error) {
    console.error('API Error:', error);
    sendJSON(res, { error: 'Internal server error' }, 500);
  }
}

// Timetable generation algorithm
async function generateTimetable() {
  return new Promise((resolve, reject) => {
    // Clear existing timetable
    db.run('DELETE FROM timetable', (err) => {
      if (err) return reject(err);
      
      // Get all subject-batch mappings
      const query = `
        SELECT sb.*, s.name as subject_name, s.type, s.credits,
               b.name as batch_name, f.name as faculty_name
        FROM subject_batch sb
        JOIN subject s ON sb.subject_id = s.id
        JOIN batch b ON sb.batch_id = b.id
        JOIN faculty f ON sb.faculty_id = f.id
      `;
      
      db.all(query, async (err, mappings) => {
        if (err) return reject(err);
        
        try {
          await scheduleClasses(mappings);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

async function scheduleClasses(mappings) {
  const schedule = {}; // day -> slot -> {batch, faculty, classroom}
  const batchSchedule = {}; // batch -> day -> count
  const facultySchedule = {}; // faculty -> day -> slots[]
  
  // Initialize schedules
  for (let day = 1; day <= 6; day++) {
    schedule[day] = {};
    for (let slot = 1; slot <= 6; slot++) {
      schedule[day][slot] = [];
    }
  }
  
  // Get available classrooms
  const classrooms = await new Promise((resolve, reject) => {
    db.all('SELECT * FROM classroom', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
  
  // Schedule each subject-batch mapping
  for (const mapping of mappings) {
    let scheduled = false;
    let attempts = 0;
    const maxAttempts = 100;
    
    while (!scheduled && attempts < maxAttempts) {
      const day = Math.floor(Math.random() * 6) + 1;
      const slot = Math.floor(Math.random() * 6) + 1;
      
      // Check constraints
      if (canSchedule(mapping, day, slot, schedule, batchSchedule, facultySchedule, classrooms)) {
        await scheduleClass(mapping, day, slot, classrooms[0]); // Simplified classroom assignment
        updateSchedules(mapping, day, slot, schedule, batchSchedule, facultySchedule);
        scheduled = true;
      }
      
      attempts++;
    }
    
    if (!scheduled) {
      console.warn(`Could not schedule ${mapping.subject_name} for ${mapping.batch_name}`);
    }
  }
}

function canSchedule(mapping, day, slot, schedule, batchSchedule, facultySchedule, classrooms) {
  // Check if batch already has 4 classes that day
  const batchKey = `${mapping.batch_id}`;
  if (batchSchedule[batchKey] && batchSchedule[batchKey][day] >= 4) {
    return false;
  }
  
  // Check faculty availability (no consecutive slots)
  const facultyKey = `${mapping.faculty_id}`;
  if (facultySchedule[facultyKey] && facultySchedule[facultyKey][day]) {
    const facultySlots = facultySchedule[facultyKey][day];
    if (facultySlots.includes(slot - 1) || facultySlots.includes(slot + 1)) {
      return false;
    }
  }
  
  // Check if slot is already occupied by batch
  const existingClasses = schedule[day][slot] || [];
  for (const existing of existingClasses) {
    if (existing.batch_id === mapping.batch_id) {
      return false;
    }
  }
  
  // For lab sessions, check if next slot is also available
  if (mapping.type === 'lab' && slot < 6) {
    const nextSlotClasses = schedule[day][slot + 1] || [];
    for (const existing of nextSlotClasses) {
      if (existing.batch_id === mapping.batch_id) {
        return false;
      }
    }
  }
  
  return true;
}

async function scheduleClass(mapping, day, slot, classroom) {
  const duration = mapping.type === 'lab' ? 2 : 1;
  
  return new Promise((resolve, reject) => {
    db.run(`
      INSERT INTO timetable (batch_id, subject_id, faculty_id, classroom_id, day_of_week, time_slot_id, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [mapping.batch_id, mapping.subject_id, mapping.faculty_id, classroom.id, day, slot, duration], 
    function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

function updateSchedules(mapping, day, slot, schedule, batchSchedule, facultySchedule) {
  // Update global schedule
  if (!schedule[day][slot]) schedule[day][slot] = [];
  schedule[day][slot].push({
    batch_id: mapping.batch_id,
    faculty_id: mapping.faculty_id
  });
  
  // Update batch schedule count
  const batchKey = `${mapping.batch_id}`;
  if (!batchSchedule[batchKey]) batchSchedule[batchKey] = {};
  if (!batchSchedule[batchKey][day]) batchSchedule[batchKey][day] = 0;
  batchSchedule[batchKey][day]++;
  
  // Update faculty schedule
  const facultyKey = `${mapping.faculty_id}`;
  if (!facultySchedule[facultyKey]) facultySchedule[facultyKey] = {};
  if (!facultySchedule[facultyKey][day]) facultySchedule[facultyKey][day] = [];
  facultySchedule[facultyKey][day].push(slot);
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // Handle API routes
  if (pathname.startsWith('/api/')) {
    return handleAPI(req, res, pathname);
  }
  
  // Handle static files
  let filePath = pathname === '/' ? '/public/index.html' : `/public${pathname}`;
  filePath = path.join(__dirname, filePath);
  
  // Check if file exists
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found');
      return;
    }
    
    // Serve the file
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server error');
        return;
      }
      
      const contentType = getContentType(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

// Initialize database and start server
initDatabase();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});