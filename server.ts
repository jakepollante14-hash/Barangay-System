import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Serve static assets cleanly (public files, source assets, and public assets)
app.use('/public', express.static(path.resolve(__dirname, 'public')));
app.use(express.static(path.resolve(__dirname, 'public')));
app.use('/assets', express.static(path.resolve(__dirname, 'public', 'assets')));
app.use('/src/assets', express.static(path.resolve(__dirname, 'src', 'assets')));

// Sample initial data matching screenshots
export interface Resident {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  contactNo: string;
  address: string;
  purok: string;
  street?: string;
  houseNo?: string;
  civilStatus: 'Single' | 'Married' | 'Divorce' | 'Widowed';
  isRegisteredVoter: boolean;
  role: 'resident' | 'admin';
  status: 'Pending' | 'Approved' | 'Rejected';
  requestDate: string;
  avatarUrl: string;
  password?: string;
  temporaryPassword?: string;
}

export interface DocumentRequestItem {
  id: string;
  residentId: string;
  fullName: string;
  profileUrl: string;
  contactNo: string;
  address: string;
  documentType: string;
  status: 'Pending' | 'In Process' | 'Ready for Pickup' | 'Completed' | 'Rejected';
  isArchived: boolean;
  purpose: string;
  dateRequested: string;
  pickupPeriod: string;
  controlNo: string;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  subtitle?: string;
  description: string;
  eventTime?: string;
  imageUrl?: string;
  author: string;
  authorAvatar: string;
  createdAt: string;
  comments: Array<{
    id: string;
    author: string;
    authorAvatar: string;
    content: string;
    createdAt: string;
  }>;
}

export interface ResidentMessageItem {
  id: string;
  residentId: string;
  residentName: string;
  residentAvatar: string;
  contactNo: string;
  message: string;
  category: string;
  status: 'Pending' | 'Under Review' | 'Resolved';
  createdAt: string;
  replies?: Array<{
    id: string;
    sender: string;
    message: string;
    createdAt: string;
  }>;
}

// In-Memory Database store (Fresh database: residents start at 0 and populate as users register)
let residents: Resident[] = [];

let documentRequests: DocumentRequestItem[] = [];

let announcements: AnnouncementItem[] = [
  {
    id: 'ann-1',
    title: 'Libreng Tuli',
    subtitle: 'Para sa mga supot',
    description: 'Libreng tuli handog ng Pamahalaang Barangay San Juan para sa mga kabataan. Mangyaring magpatala sa barangay health center at magdala ng birth certificate.',
    eventTime: '11/23/2030, 1:00am',
    imageUrl: '/barangay_hall.jpg',
    author: 'Barangay Admin',
    authorAvatar: '/barangay_seal_logo.jpg',
    createdAt: '11/24/26, 1:30am',
    comments: [
      {
        id: 'c-1',
        author: 'Rene Baterbonia',
        authorAvatar: '/filipino_male_resident_1792164529391.jpg',
        content: 'Sino po mag tutuli?',
        createdAt: '11/18/2030, 1:30pm',
      },
      {
        id: 'c-2',
        author: 'Barangay Admin',
        authorAvatar: '/barangay_seal_logo.jpg',
        content: 'Mga lisensyadong doktor at nars po mula sa Municipal Health Office ng Licab.',
        createdAt: '11/18/2030, 2:15pm',
      },
    ],
  },
  {
    id: 'ann-2',
    title: 'Barangay Assembly & Clean-Up Drive',
    subtitle: 'Oplan Tapat Ko, Linis Ko',
    description: 'Inaanyayahan ang lahat ng mga residente sa darating na Sabado para sa taunang General Assembly at sabayang paglilinis ng mga kanal at kalsada.',
    eventTime: '12/05/2026, 7:00am',
    imageUrl: '/barangay_hall.jpg',
    author: 'Barangay Admin',
    authorAvatar: '/barangay_seal_logo.jpg',
    createdAt: '10/20/26, 9:00am',
    comments: [],
  },
];

let residentMessages: ResidentMessageItem[] = [];

// REST API ROUTES
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Stats overview (100% Dynamic: kung sino lang ang nag-request/rehistro sa system, sila ang bilang)
app.get('/api/stats', (_req: Request, res: Response) => {
  const totalPopulation = residents.filter(r => r.status === 'Approved').length;
  const pendingApprovals = residents.filter(r => r.status === 'Pending').length;
  const pendingDocuments = documentRequests.filter(d => !d.isArchived && d.status === 'Pending').length;
  const totalDocuments = documentRequests.filter(d => !d.isArchived).length;
  const totalMessages = residentMessages.length;
  const registeredVoters = residents.filter(r => r.status === 'Approved' && r.isRegisteredVoter).length;

  res.json({
    totalPopulation,
    pendingApprovals,
    pendingDocuments,
    totalDocuments,
    totalMessages,
    registeredVoters,
  });
});

// Reset population endpoint
app.post('/api/residents/reset', (_req: Request, res: Response) => {
  residents = [];
  documentRequests = [];
  residentMessages = [];
  res.json({ success: true, message: 'Na-reset na ang lahat ng populasyon sa 0.' });
});

// Auth
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { name, password, role } = req.body;
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  const trimmedPassword = typeof password === 'string' ? password.trim() : '';

  // Prevent login if Name or Password is empty
  if (!trimmedName || !trimmedPassword) {
    return res.status(400).json({
      success: false,
      message: 'Mangyaring ilagay ang iyong Pangalan at Password.',
    });
  }

  const lowerName = trimmedName.toLowerCase();
  const isAdmin =
    role === 'admin' ||
    lowerName === 'admin' ||
    lowerName === 'barangay admin' ||
    lowerName === 'kapitan' ||
    lowerName.includes('admin') ||
    lowerName === 'juan dela cruz';

  if (isAdmin) {
    if (
      trimmedPassword === 'admin' ||
      trimmedPassword === 'admin123' ||
      trimmedPassword === 'password123'
    ) {
      return res.json({
        success: true,
        user: {
          id: 'admin-1',
          firstName: 'Hon. Harold',
          lastName: 'Villaroman',
          fullName: 'Hon. Harold Villaroman',
          role: 'admin',
          contactNo: '09944258953',
          avatarUrl: '/barangay_seal_logo.jpg',
        },
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Maling password para sa Admin account. (Default: admin123 o password123)',
      });
    }
  }

  // Resident search by name
  const found = residents.find(
    r => r.fullName.toLowerCase().includes(trimmedName.toLowerCase()) ||
         trimmedName.toLowerCase().includes(r.fullName.toLowerCase())
  );

  if (!found) {
    return res.status(404).json({
      success: false,
      message: 'Hindi nahanap ang resident account. Pakisuri ang iyong pangalan o mag-register.',
    });
  }

  // Password verification
  const validPassword = found.password || 'password123';
  if (trimmedPassword !== validPassword) {
    return res.status(401).json({
      success: false,
      message: 'Maling password. Pakisubukang muli.',
    });
  }

  if (found.status === 'Pending') {
    return res.status(403).json({
      success: false,
      message: 'Ang account na ito ay naghihintay pa ng pagsusuri at pag-apruba ng Barangay Admin.',
    });
  }

  return res.json({ success: true, user: found });
});

// Registration (Creating Account)
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { firstName, lastName, email, contactNo, purok, street, houseNo, civilStatus, address, password, avatarUrl } = req.body;

  const newResident: Resident = {
    id: `res-${Date.now()}`,
    firstName: firstName || 'Bagong',
    lastName: lastName || 'Residente',
    fullName: `${firstName || ''} ${lastName || ''}`.trim() || 'Bagong Residente',
    email: email || '',
    contactNo: contactNo || '',
    address: address || `${houseNo ? houseNo + ', ' : ''}${street ? street + ', ' : ''}${purok || 'San Juan'}, Licab, Nueva Ecija`,
    purok: purok || 'Purok 1',
    street: street || '',
    houseNo: houseNo || '',
    civilStatus: civilStatus || 'Single',
    isRegisteredVoter: false,
    role: 'resident',
    status: 'Pending',
    password: password || 'password123',
    requestDate: new Date().toLocaleDateString('en-US'),
    avatarUrl: avatarUrl || '/filipino_male_resident_1792164529391.jpg',
  };

  residents.unshift(newResident);
  res.json({ success: true, resident: newResident });
});

// Residents listing
app.get('/api/residents', (req: Request, res: Response) => {
  const { status, voter, search } = req.query;
  let list = [...residents];

  if (status) {
    list = list.filter(r => r.status === status);
  }
  if (voter === 'true') {
    list = list.filter(r => r.isRegisteredVoter);
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      r =>
        r.fullName.toLowerCase().includes(q) ||
        r.contactNo.includes(q) ||
        r.address.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

// Update Resident Profile (photo, contact details, etc.)
app.put('/api/residents/:id', (req: Request, res: Response) => {
  const resident = residents.find(r => r.id === req.params.id);
  if (!resident) {
    if (req.params.id === 'admin-1' || req.params.id.startsWith('admin')) {
      return res.json({
        success: true,
        resident: {
          id: req.params.id,
          firstName: req.body.firstName || 'Hon. Harold',
          lastName: req.body.lastName || 'Villaroman',
          fullName: req.body.fullName || 'Hon. Harold Villaroman',
          role: 'admin',
          avatarUrl: req.body.avatarUrl || '/barangay_seal_logo.jpg',
        },
      });
    }
    return res.status(404).json({ success: false, message: 'Resident not found' });
  }

  if (req.body.fullName) resident.fullName = req.body.fullName;
  if (req.body.firstName) resident.firstName = req.body.firstName;
  if (req.body.lastName) resident.lastName = req.body.lastName;
  if (req.body.email !== undefined) resident.email = req.body.email;
  if (req.body.contactNo !== undefined) resident.contactNo = req.body.contactNo;
  if (req.body.address !== undefined) resident.address = req.body.address;
  if (req.body.purok !== undefined) resident.purok = req.body.purok;
  if (req.body.civilStatus !== undefined) resident.civilStatus = req.body.civilStatus;
  if (req.body.avatarUrl !== undefined) resident.avatarUrl = req.body.avatarUrl;
  if (req.body.password) resident.password = req.body.password;

  res.json({ success: true, resident });
});

// Approvals
app.get('/api/approvals', (_req: Request, res: Response) => {
  res.json(residents);
});

app.post('/api/approvals/:id/approve', (req: Request, res: Response) => {
  const resident = residents.find(r => r.id === req.params.id);
  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }
  resident.status = 'Approved';
  resident.temporaryPassword = `SJ-${Math.floor(1000 + Math.random() * 9000)}`;
  res.json({ success: true, resident });
});

app.post('/api/approvals/:id/reject', (req: Request, res: Response) => {
  const resident = residents.find(r => r.id === req.params.id);
  if (!resident) {
    return res.status(404).json({ error: 'Resident not found' });
  }
  resident.status = 'Rejected';
  res.json({ success: true, resident });
});

// Remove resident
app.delete('/api/residents/:id', (req: Request, res: Response) => {
  residents = residents.filter(r => r.id !== req.params.id);
  res.json({ success: true });
});

// Document Requests
app.get('/api/documents', (req: Request, res: Response) => {
  const { residentId, status, type, archive, search } = req.query;
  let list = [...documentRequests];

  if (archive === 'true') {
    list = list.filter(d => d.isArchived);
  } else if (archive === 'false') {
    list = list.filter(d => !d.isArchived);
  }

  if (residentId) {
    list = list.filter(d => d.residentId === residentId);
  }
  if (status && status !== 'All Status') {
    list = list.filter(d => d.status.toLowerCase() === String(status).toLowerCase());
  }
  if (type && type !== 'All Types') {
    list = list.filter(d => d.documentType.toLowerCase().includes(String(type).toLowerCase()));
  }
  if (search) {
    const q = String(search).toLowerCase();
    list = list.filter(
      d =>
        d.fullName.toLowerCase().includes(q) ||
        d.controlNo.toLowerCase().includes(q) ||
        d.documentType.toLowerCase().includes(q)
    );
  }

  res.json(list);
});

app.post('/api/documents', (req: Request, res: Response) => {
  const { residentId, fullName, contactNo, address, documentTypes, purpose } = req.body;

  const types = Array.isArray(documentTypes) ? documentTypes : [documentTypes || 'Barangay Clearance'];
  const createdItems: DocumentRequestItem[] = [];

  const pickupDate = new Date();
  pickupDate.setDate(pickupDate.getDate() + 3);

  types.forEach((type, idx) => {
    const item: DocumentRequestItem = {
      id: `doc-${Date.now()}-${idx}`,
      residentId: residentId || 'res-1',
      fullName: fullName || 'John Rhonel Celin',
      profileUrl: '/filipino_male_resident_1792164529391.jpg',
      contactNo: contactNo || '09704875728',
      address: address || 'Purok 5, Mapagmahal St., San Juan',
      documentType: type,
      status: 'Pending',
      isArchived: false,
      purpose: purpose || 'General Requirement',
      dateRequested: new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      pickupPeriod: pickupDate.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      controlNo: `SJ-${Date.now().toString().slice(-4)}`,
    };
    documentRequests.unshift(item);
    createdItems.push(item);
  });

  res.json({ success: true, documents: createdItems });
});

app.patch('/api/documents/:id', (req: Request, res: Response) => {
  const item = documentRequests.find(d => d.id === req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Document not found' });
  }

  if (req.body.status !== undefined) item.status = req.body.status;
  if (req.body.isArchived !== undefined) item.isArchived = req.body.isArchived;

  res.json({ success: true, document: item });
});

app.delete('/api/documents/:id', (req: Request, res: Response) => {
  documentRequests = documentRequests.filter(d => d.id !== req.params.id);
  res.json({ success: true });
});

// Announcements
app.get('/api/announcements', (_req: Request, res: Response) => {
  res.json(announcements);
});

app.post('/api/announcements', (req: Request, res: Response) => {
  const { title, subtitle, description, eventTime, imageUrl } = req.body;
  const newAnn: AnnouncementItem = {
    id: `ann-${Date.now()}`,
    title: title || 'Bagong Patalastas',
    subtitle: subtitle || '',
    description: description || '',
    eventTime: eventTime || 'TBA',
    imageUrl: imageUrl || '/barangay_hall.jpg',
    author: 'Barangay Admin',
    authorAvatar: '/barangay_seal_logo.jpg',
    createdAt: new Date().toLocaleString(),
    comments: [],
  };
  announcements.unshift(newAnn);
  res.json({ success: true, announcement: newAnn });
});

app.post('/api/announcements/:id/comment', (req: Request, res: Response) => {
  const ann = announcements.find(a => a.id === req.params.id);
  if (!ann) {
    return res.status(404).json({ error: 'Announcement not found' });
  }
  const { author, authorAvatar, content } = req.body;
  const newComment = {
    id: `c-${Date.now()}`,
    author: author || 'Residente',
    authorAvatar: authorAvatar || '/filipino_male_resident_1792164529391.jpg',
    content: content || '',
    createdAt: new Date().toLocaleString(),
  };
  ann.comments.push(newComment);
  res.json({ success: true, comment: newComment });
});

app.delete('/api/announcements/:id', (req: Request, res: Response) => {
  announcements = announcements.filter(a => a.id !== req.params.id);
  res.json({ success: true });
});

// Resident Messages & Blotter Reports
app.get('/api/messages', (_req: Request, res: Response) => {
  res.json(residentMessages);
});

app.post('/api/messages', (req: Request, res: Response) => {
  const { residentId, residentName, contactNo, message, category } = req.body;
  const newMsg: ResidentMessageItem = {
    id: `msg-${Date.now()}`,
    residentId: residentId || 'res-1',
    residentName: residentName || 'John Rhonel Celin',
    residentAvatar: '/filipino_male_resident_1792164529391.jpg',
    contactNo: contactNo || '09704875728',
    message: message || '',
    category: category || 'General Inquiry',
    status: 'Pending',
    createdAt: new Date().toLocaleString(),
    replies: [],
  };
  residentMessages.unshift(newMsg);
  res.json({ success: true, message: newMsg });
});

app.post('/api/messages/:id/reply', (req: Request, res: Response) => {
  const msg = residentMessages.find(m => m.id === req.params.id);
  if (!msg) {
    return res.status(404).json({ error: 'Message not found' });
  }
  const { sender, message } = req.body;
  if (!msg.replies) msg.replies = [];
  const rep = {
    id: `rep-${Date.now()}`,
    sender: sender || 'Barangay Admin',
    message: message || '',
    createdAt: new Date().toLocaleString(),
  };
  msg.replies.push(rep);
  msg.status = 'Under Review';
  res.json({ success: true, reply: rep });
});

app.delete('/api/messages/:id', (req: Request, res: Response) => {
  residentMessages = residentMessages.filter(m => m.id !== req.params.id);
  res.json({ success: true });
});

// Serve Vite frontend in dev mode or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const hasDist = fs.existsSync(path.resolve(__dirname, 'dist', 'index.html'));

  // If a production build exists or NODE_ENV=production, serve the built dist bundle directly
  if (isProd || hasDist) {
    app.use('/assets', express.static(path.resolve(__dirname, 'dist', 'assets')));
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response, next) => {
      if (req.originalUrl.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'custom',
      });
      app.use(vite.middlewares);

      // Handle HTML requests with Vite transforms (injecting HMR, React preamble, etc.)
      app.use('*', async (req: Request, res: Response, next) => {
        const url = req.originalUrl;
        if (url.startsWith('/api') || (url.includes('.') && !url.endsWith('.html'))) {
          return next();
        }
        try {
          const indexPath = path.resolve(__dirname, 'index.html');
          if (fs.existsSync(indexPath)) {
            let template = fs.readFileSync(indexPath, 'utf-8');
            template = await vite.transformIndexHtml(url, template);
            return res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
          }
          return next();
        } catch (e: any) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (err) {
      console.error('Failed to initialize Vite dev server:', err);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Barangay San Juan Management Portal running on http://localhost:${PORT}`);
  });
}

startServer();
