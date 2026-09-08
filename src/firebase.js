import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc,
  getDocs,
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

// ----------------------------------------------------
// 1. Firebase configuration validation
// ----------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBCIaVeGxPEpB74SAGI-cRgikBY9qW1UuQ",
  authDomain: "vfxlabpilot.firebaseapp.com",
  projectId: "vfxlabpilot",
  storageBucket: "vfxlabpilot.firebasestorage.app",
  messagingSenderId: "987011446411",
  appId: "1:987011446411:web:6eb39da9988ed63985868e",
  measurementId: "G-69TD54CP8Z"
};

const hasValidFirebaseConfig = 
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey !== 'your_api_key_here' &&
  firebaseConfig.projectId &&
  firebaseConfig.projectId !== 'your_project_id_here';

let db = null;
let auth = null;
let isMockMode = false; // Forced false to ensure Firebase connection and avoid fallback issues

// ----------------------------------------------------
// 2. Mock Database Implementation (Local Storage)
// ----------------------------------------------------

// Default data sets matching the Firestore schema requirements
const DEFAULT_STUDENTS = [
  { id: 'stud-1', name: 'Alex Mercer', batch: 'VFX-2026-A' },
  { id: 'stud-2', name: 'Sarah Connor', batch: 'VFX-2026-A' },
  { id: 'stud-3', name: 'Bruce Wayne', batch: '3D-ANIM-B' },
  { id: 'stud-4', name: 'Peter Parker', batch: '3D-ANIM-B' },
  { id: 'stud-5', name: 'Tony Stark', batch: 'COMP-2026-C' },
  { id: 'stud-6', name: 'Selina Kyle', batch: 'COMP-2026-C' }
];

const DEFAULT_BATCHES = [
  { id: 'b-1', batchName: 'VFX-2026-A' },
  { id: 'b-2', batchName: '3D-ANIM-B' },
  { id: 'b-3', batchName: 'COMP-2026-C' }
];

const DEFAULT_MODES = [
  { id: 'academic', modeName: 'Academic', isCustom: false },
  { id: 'production', modeName: 'Production', isCustom: false },
  { id: 'research', modeName: 'Research', isCustom: false },
  { id: 'genai', modeName: 'NAIL, GenAI Lab', isCustom: false }
];

const DEFAULT_SETTINGS_ACADEMIC = [
  {
    id: 'VFX-2026-A',
    topics: ['3D Modeling basics', 'Nuke Compositing', 'Houdini Fluid FX'],
    instructions: 'Follow batch instructions. Submit final pyro render files to the lab server directory before session end.',
    timeslot: '09:00 AM - 01:00 PM'
  },
  {
    id: '3D-ANIM-B',
    topics: ['Character Rigging basics', 'Walk Cycle principles', 'Substance Painter Texturing'],
    instructions: 'Prepare your walk cycle drafts and save to the local project drive folder.',
    timeslot: '02:00 PM - 06:00 PM'
  },
  {
    id: 'COMP-2026-C',
    topics: ['Keying workflows', 'Rotoscoping essentials', 'Color Matching in Nuke'],
    instructions: 'Finish keying exercise and submit composite plates.',
    timeslot: '09:00 AM - 01:00 PM'
  }
];

const DEFAULT_SETTINGS_PRODUCTION = [
  {
    id: 'VFX-2026-A',
    projects: [
      { name: 'Cyberpunk Odyssey CGI', timing: '02:00 PM - 06:00 PM', taskType: 'Production' }
    ]
  },
  {
    id: '3D-ANIM-B',
    projects: [
      { name: 'Lost Forest Animation', timing: '09:00 AM - 01:00 PM', taskType: 'Pre Production' }
    ]
  },
  {
    id: 'COMP-2026-C',
    projects: [
      { name: 'Neon Soda Promo Edit', timing: '02:00 PM - 06:00 PM', taskType: 'Post Production' }
    ]
  }
];

const DEFAULT_SETTINGS_RESEARCH = [
  {
    id: 'config',
    assignmentTopics: ['AI Rendering Pipelines in Unreal Engine 5', 'NeRF vs Traditional Photogrammetry', 'Real-time Raytracing Optimization'],
    instructions: ''
  }
];

const DEFAULT_SETTINGS_GENAI = [
  {
    id: 'VFX-2026-A',
    projects: [
      { name: 'Neural Avatar Generation', timing: '09:00 AM - 01:00 PM', taskType: 'GenAI Project' }
    ],
    instructions: 'Execute Generative AI models. Log performance and render times.'
  },
  {
    id: '3D-ANIM-B',
    projects: [
      { name: 'AI Text-to-3D Asset Gen', timing: '02:00 PM - 06:00 PM', taskType: 'GenAI Project' }
    ],
    instructions: 'Generate 3D draft assets using Stable Video 3D.'
  },
  {
    id: 'COMP-2026-C',
    projects: [
      { name: 'DeepFake Face Swap Plate', timing: '09:00 AM - 01:00 PM', taskType: 'GenAI Project' }
    ],
    instructions: 'Composit and clean face swap plates.'
  }
];

// Generate default computers grid (PC-01 to PC-25)
const generateDefaultComputers = () => {
  const comps = [];
  for (let i = 1; i <= 25; i++) {
    const pcId = `PC-${String(i).padStart(2, '0')}`;
    // Simulate some active and some idle computers to look dynamic out of the box
    let status = 'offline';
    let currentUser = null;
    let currentMode = null;
    let currentTask = null;
    
    if (i === 3) {
      status = 'online';
      currentUser = 'Alex Mercer';
      currentMode = 'Academic';
      currentTask = 'Practicing Houdini Pyro simulations';
    } else if (i === 8) {
      status = 'online';
      currentUser = 'Bruce Wayne';
      currentMode = 'Production';
      currentTask = 'Rendering cyberpunk assets';
    } else if (i === 15) {
      status = 'online';
      currentUser = 'Tony Stark';
      currentMode = 'Research';
      currentTask = 'Writing report on AI rendering pipelines';
    }

    comps.push({
      id: pcId,
      status,
      currentUser,
      currentMode,
      currentTask,
      lastActive: new Date().toISOString(),
      message: null
    });
  }
  return comps;
};

// Initialize localStorage helper
const initLocalStorage = () => {
  const cleanAndGetArray = (key, defaultVal) => {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return defaultVal;
      }
      return parsed;
    } catch {
      return defaultVal;
    }
  };

  if (!localStorage.getItem('vfx_computers')) {
    localStorage.setItem('vfx_computers', JSON.stringify(generateDefaultComputers()));
  }
  if (!localStorage.getItem('vfx_students')) {
    localStorage.setItem('vfx_students', JSON.stringify(DEFAULT_STUDENTS));
  }
  if (!localStorage.getItem('vfx_batches')) {
    localStorage.setItem('vfx_batches', JSON.stringify(DEFAULT_BATCHES));
  }
  if (!localStorage.getItem('vfx_modes')) {
    localStorage.setItem('vfx_modes', JSON.stringify(DEFAULT_MODES));
  }
  
  localStorage.setItem('vfx_settings_academic', JSON.stringify(cleanAndGetArray('vfx_settings_academic', DEFAULT_SETTINGS_ACADEMIC)));
  localStorage.setItem('vfx_settings_production', JSON.stringify(cleanAndGetArray('vfx_settings_production', DEFAULT_SETTINGS_PRODUCTION)));
  localStorage.setItem('vfx_settings_research', JSON.stringify(cleanAndGetArray('vfx_settings_research', DEFAULT_SETTINGS_RESEARCH)));
  localStorage.setItem('vfx_settings_genai', JSON.stringify(cleanAndGetArray('vfx_settings_genai', DEFAULT_SETTINGS_GENAI)));
  
  if (!localStorage.getItem('vfx_activity_logs')) {
    localStorage.setItem('vfx_activity_logs', JSON.stringify([]));
  }
  if (!localStorage.getItem('vfx_app_versions')) {
    localStorage.setItem('vfx_app_versions', JSON.stringify([
      { id: 'student', version: '1.0.0-beta', downloadUrl: 'https://drive.google.com/drive/folders/your_student_folder_id' },
      { id: 'hod', version: '1.0.0-beta', downloadUrl: 'https://drive.google.com/drive/folders/your_hod_folder_id' }
    ]));
  }
  if (!localStorage.getItem('vfx_auth_user')) {
    localStorage.setItem('vfx_auth_user', JSON.stringify(null));
  }
};

if (isMockMode) {
  initLocalStorage();
}

// In-memory listener Registry for Mock Mode reactive updates
const listeners = {};

const triggerListeners = (collectionName, data) => {
  if (listeners[collectionName]) {
    listeners[collectionName].forEach(callback => callback(data));
  }
  if (Array.isArray(data)) {
    data.forEach(item => {
      const listenerKey = `${collectionName}_${item.id}`;
      if (listeners[listenerKey]) {
        listeners[listenerKey].forEach(callback => callback(item));
      }
    });
  }
};

// ----------------------------------------------------
// 3. Unified Abstraction Layer Exports
// ----------------------------------------------------

/**
 * Subscribes to collection updates (real-time).
 * Works with Firestore onSnapshot when in Firebase mode, falls back to local storage pub/sub.
 */
export const subscribeCollection = (collectionName, callback) => {
  if (!isMockMode) {
    // Real Firestore setup
    const q = collection(db, collectionName);
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(data);
    }, (error) => {
      console.error(`Firestore subscribe error for ${collectionName}:`, error);
      callback([]);
    });
  } else {
    // Mock Mode
    if (!listeners[collectionName]) {
      listeners[collectionName] = [];
    }
    listeners[collectionName].push(callback);

    // Initial trigger with current state
    const data = JSON.parse(localStorage.getItem(`vfx_${collectionName}`) || '[]');
    // Adjust single configurations that are objects, not arrays
    if (collectionName.startsWith('settings_') && !Array.isArray(data)) {
      callback([data]); // wrap in array to keep signature unified
    } else {
      callback(data);
    }

    // Return unsubscribe function
    return () => {
      listeners[collectionName] = listeners[collectionName].filter(cb => cb !== callback);
    };
  }
};

/**
 * Fetches a single document from a collection (one-time read).
 */
export const getDocument = async (collectionName, docId) => {
  if (!isMockMode) {
    const docRef = doc(db, collectionName, docId);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } else {
    const storageKey = `vfx_${collectionName}`;
    const rawData = localStorage.getItem(storageKey);
    const items = JSON.parse(rawData || '[]');
    return items.find(item => item.id === docId) || null;
  }
};

/**
 * Subscribes to a single document updates (real-time).
 */
export const subscribeDocument = (collectionName, docId, callback) => {
  if (!isMockMode) {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error(`Firestore document subscribe error for ${collectionName}/${docId}:`, error);
      callback(null);
    });
  } else {
    const listenerKey = `${collectionName}_${docId}`;
    if (!listeners[listenerKey]) {
      listeners[listenerKey] = [];
    }
    listeners[listenerKey].push(callback);

    // Initial trigger
    const storageKey = `vfx_${collectionName}`;
    const rawData = localStorage.getItem(storageKey);
    const items = JSON.parse(rawData || '[]');
    const docData = items.find(item => item.id === docId) || null;
    callback(docData);

    return () => {
      listeners[listenerKey] = listeners[listenerKey].filter(cb => cb !== callback);
    };
  }
};

/**
 * Adds a new document to a collection.
 */
export const addDocument = async (collectionName, data) => {
  if (!isMockMode) {
    // Real Firestore
    const collRef = collection(db, collectionName);
    const docRef = await addDoc(collRef, {
      ...data,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } else {
    // Mock Mode
    const items = JSON.parse(localStorage.getItem(`vfx_${collectionName}`) || '[]');
    const newDoc = {
      id: data.id || `doc-${Math.random().toString(36).substring(2, 9)}`,
      ...data,
      createdAt: new Date().toISOString()
    };
    items.push(newDoc);
    localStorage.setItem(`vfx_${collectionName}`, JSON.stringify(items));
    triggerListeners(collectionName, items);
    return newDoc.id;
  }
};

/**
 * Updates an existing document in a collection.
 */
export const updateDocument = async (collectionName, docId, data) => {
  if (!isMockMode) {
    // Real Firestore
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, data, { merge: true });
  } else {
    // Mock Mode
    const storageKey = `vfx_${collectionName}`;
    const rawData = localStorage.getItem(storageKey);
    let items = JSON.parse(rawData || '[]');
    
    const exists = items.some(item => item.id === docId);
    if (!exists) {
      items.push({ id: docId, ...data });
    } else {
      items = items.map(item => item.id === docId ? { ...item, ...data } : item);
    }
    
    localStorage.setItem(storageKey, JSON.stringify(items));
    triggerListeners(collectionName, items);
  }
};

/**
 * Deletes a document from a collection.
 */
export const deleteDocument = async (collectionName, docId) => {
  if (!isMockMode) {
    // Real Firestore
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } else {
    // Mock Mode
    const storageKey = `vfx_${collectionName}`;
    let items = JSON.parse(localStorage.getItem(storageKey) || '[]');
    items = items.filter(item => item.id !== docId);
    localStorage.setItem(storageKey, JSON.stringify(items));
    triggerListeners(collectionName, items);
  }
};

// ----------------------------------------------------
// 4. Unified Authentication Abstraction
// ----------------------------------------------------

export const loginHOD = async (username, password) => {
  if (!isMockMode) {
    const email = username.includes('@') ? username : `${username}@neofilmschool.com`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } else {
    // Simulating authentication for development
    if (username === 'vfxdept' && password === 'admin0461') {
      const mockUser = { username, role: 'HOD', name: 'HOD Admin' };
      localStorage.setItem('vfx_auth_user', JSON.stringify(mockUser));
      
      // Notify auth state listeners
      if (listeners['auth']) {
        listeners['auth'].forEach(callback => callback(mockUser));
      }
      return mockUser;
    } else {
      throw new Error('Invalid HOD credentials. (Use vfxdept / admin0461 in Mock Mode)');
    }
  }
};

export const logoutHOD = async () => {
  if (!isMockMode) {
    await signOut(auth);
  } else {
    localStorage.setItem('vfx_auth_user', JSON.stringify(null));
    if (listeners['auth']) {
      listeners['auth'].forEach(callback => callback(null));
    }
  }
};

export const subscribeAuth = (callback) => {
  if (!isMockMode) {
    return onAuthStateChanged(auth, callback);
  } else {
    if (!listeners['auth']) {
      listeners['auth'] = [];
    }
    listeners['auth'].push(callback);

    // Initial fire
    const user = JSON.parse(localStorage.getItem('vfx_auth_user'));
    callback(user);

    return () => {
      listeners['auth'] = listeners['auth'].filter(cb => cb !== callback);
    };
  }
};

// ----------------------------------------------------
// 5. Database Auto-Seeder for Online Mode
// ----------------------------------------------------
const seedFirebaseDatabase = async () => {
  try {
    // 1. Seed Modes
    const modesRef = collection(db, 'modes');
    const modesSnap = await getDocs(modesRef);
    if (modesSnap.empty) {
      console.log('🌱 Seeding default system modes to Firestore...');
      for (const m of DEFAULT_MODES) {
        await setDoc(doc(db, 'modes', m.id), m);
      }
    }

    // 2. Seed Computers
    const compsRef = collection(db, 'computers');
    const compsSnap = await getDocs(compsRef);
    if (compsSnap.empty) {
      console.log('🌱 Seeding default computers to Firestore...');
      const defaultComps = generateDefaultComputers();
      for (const c of defaultComps) {
        await setDoc(doc(db, 'computers', c.id), c);
      }
    }

    // 3. Seed Batches
    const batchesRef = collection(db, 'batches');
    const batchesSnap = await getDocs(batchesRef);
    if (batchesSnap.empty) {
      console.log('🌱 Seeding default batches to Firestore...');
      for (const b of DEFAULT_BATCHES) {
        await setDoc(doc(db, 'batches', b.id), b);
      }
    }

    // 4. Seed Students
    const studentsRef = collection(db, 'students');
    const studentsSnap = await getDocs(studentsRef);
    if (studentsSnap.empty) {
      console.log('🌱 Seeding default students to Firestore...');
      for (const s of DEFAULT_STUDENTS) {
        await setDoc(doc(db, 'students', s.id), s);
      }
    }

    // 5. Seed Settings Academic
    const acadRef = collection(db, 'settings_academic');
    const acadSnap = await getDocs(acadRef);
    if (acadSnap.empty) {
      console.log('🌱 Seeding default academic settings to Firestore...');
      for (const sa of DEFAULT_SETTINGS_ACADEMIC) {
        await setDoc(doc(db, 'settings_academic', sa.id), sa);
      }
    }

    // 6. Seed Settings Production
    const prodRef = collection(db, 'settings_production');
    const prodSnap = await getDocs(prodRef);
    if (prodSnap.empty) {
      console.log('🌱 Seeding default production settings to Firestore...');
      for (const sp of DEFAULT_SETTINGS_PRODUCTION) {
        await setDoc(doc(db, 'settings_production', sp.id), sp);
      }
    }

    // 7. Seed Settings Research
    const resRef = collection(db, 'settings_research');
    const resSnap = await getDocs(resRef);
    if (resSnap.empty) {
      console.log('🌱 Seeding default research settings to Firestore...');
      for (const sr of DEFAULT_SETTINGS_RESEARCH) {
        await setDoc(doc(db, 'settings_research', sr.id), sr);
      }
    }

    // 8. Seed Settings GenAI
    const genaiRef = collection(db, 'settings_genai');
    const genaiSnap = await getDocs(genaiRef);
    if (genaiSnap.empty) {
      console.log('🌱 Seeding default GenAI settings to Firestore...');
      for (const sg of DEFAULT_SETTINGS_GENAI) {
        await setDoc(doc(db, 'settings_genai', sg.id), sg);
      }
    }

    // 9. Seed App Versions (for browser-based updater)
    const versionsRef = collection(db, 'app_versions');
    const versionsSnap = await getDocs(versionsRef);
    if (versionsSnap.empty) {
      console.log('🌱 Seeding default app versions to Firestore...');
      await setDoc(doc(db, 'app_versions', 'student'), {
        version: '1.0.0-beta',
        downloadUrl: 'https://drive.google.com/drive/folders/your_student_folder_id'
      });
      await setDoc(doc(db, 'app_versions', 'hod'), {
        version: '1.0.0-beta',
        downloadUrl: 'https://drive.google.com/drive/folders/your_hod_folder_id'
      });
    }

    console.log('✅ Firebase Firestore seeder check completed successfully!');
  } catch (error) {
    console.error('❌ Error during Firebase Firestore seeding:', error);
  }
};

// ----------------------------------------------------
// 6. Initialization Execution
// ----------------------------------------------------
if (hasValidFirebaseConfig) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    isMockMode = false;
    console.log('🔥 Connected successfully to Firebase & Firestore!');
  } catch (error) {
    console.error('Failed to initialize Firebase, falling back to Mock Mode:', error);
    isMockMode = true;
    initLocalStorage();
  }
} else {
  console.warn(
    '⚠️ Firebase credentials not configured or placeholder detected.\n' +
    '🚀 Entering Simulation / Mock Mode. Data will persist in browser localStorage.'
  );
  isMockMode = true;
  initLocalStorage();
}

export { db, auth, isMockMode, seedFirebaseDatabase };
export default {
  subscribeCollection,
  getDocument,
  subscribeDocument,
  addDocument,
  updateDocument,
  deleteDocument,
  loginHOD,
  logoutHOD,
  subscribeAuth,
  isMockMode
};
