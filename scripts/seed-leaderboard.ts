/**
 * This script seeds the leaderboard with sample data.
 * Run it with: npx ts-node scripts/seed-leaderboard.ts
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Sample leaderboard entries
const sampleEntries = [
  { initials: 'AAA', score: 5000 },
  { initials: 'BBB', score: 4500 },
  { initials: 'CCC', score: 4000 },
  { initials: 'DDD', score: 3500 },
  { initials: 'EEE', score: 3000 },
  { initials: 'FFF', score: 2500 },
  { initials: 'GGG', score: 2000 },
  { initials: 'HHH', score: 1500 },
  { initials: 'III', score: 1000 },
  { initials: 'JJJ', score: 500 },
];

async function seedLeaderboard() {
  try {
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    
    console.log('Seeding leaderboard...');
    const leaderboardRef = collection(db, 'leaderboard');
    
    for (const entry of sampleEntries) {
      await addDoc(leaderboardRef, {
        ...entry,
        date: serverTimestamp(),
      });
      console.log(`Added entry: ${entry.initials} - ${entry.score}`);
    }
    
    console.log('Leaderboard seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding leaderboard:', error);
    process.exit(1);
  }
}

seedLeaderboard(); 