import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  addDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from './firebase';

// Define the leaderboard entry type
export interface LeaderboardEntry {
  id?: string;
  initials: string;
  score: number;
  date?: Date | any; // Firestore timestamp
}

// Collection name in Firestore
const LEADERBOARD_COLLECTION = 'leaderboard';

/**
 * Get the top leaderboard entries
 * @param count - Number of entries to retrieve (default: 10)
 */
export async function getTopScores(count = 10): Promise<LeaderboardEntry[]> {
  try {
    const leaderboardRef = collection(db, LEADERBOARD_COLLECTION);
    const q = query(leaderboardRef, orderBy('score', 'desc'), limit(count));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().date?.toDate() // Convert Firestore timestamp to Date
    })) as LeaderboardEntry[];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

/**
 * Add a new score to the leaderboard
 * @param entry - The leaderboard entry to add
 */
export async function addScore(entry: Omit<LeaderboardEntry, 'id' | 'date'>): Promise<string | null> {
  try {
    // Validate initials (3 characters)
    const sanitizedInitials = entry.initials.toUpperCase().substring(0, 3);
    
    const leaderboardRef = collection(db, LEADERBOARD_COLLECTION);
    const docRef = await addDoc(leaderboardRef, {
      initials: sanitizedInitials,
      score: entry.score,
      date: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error adding score to leaderboard:', error);
    return null;
  }
}

/**
 * Check if a score is high enough to be on the leaderboard
 * @param score - The score to check
 * @param count - Number of entries on the leaderboard (default: 10)
 */
export async function isHighScore(score: number, count = 10): Promise<boolean> {
  try {
    const scores = await getTopScores(count);
    
    // If we have fewer than the maximum entries, any score is a high score
    if (scores.length < count) return true;
    
    // Check if the score is higher than the lowest score on the leaderboard
    return score > (scores[scores.length - 1]?.score || 0);
  } catch (error) {
    console.error('Error checking if score is high score:', error);
    return false;
  }
} 