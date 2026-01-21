import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const dropEnrollmentNumberIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/campusone_db');
    
    console.log('Connected to MongoDB');
    
    // Get the students collection
    const db = mongoose.connection.db;
    const studentsCollection = db.collection('students');
    
    // Get all indexes
    const indexes = await studentsCollection.indexes();
    console.log('Current indexes:', indexes.map(idx => idx.name));
    
    // Check if enrollmentNumber index exists
    const hasEnrollmentNumberIndex = indexes.some(idx => 
      idx.name === 'enrollmentNumber_1' || 
      (idx.key && idx.key.enrollmentNumber)
    );
    
    if (hasEnrollmentNumberIndex) {
      console.log('Found enrollmentNumber index, dropping it...');
      await studentsCollection.dropIndex('enrollmentNumber_1');
      console.log('✓ Successfully dropped enrollmentNumber_1 index');
    } else {
      console.log('No enrollmentNumber index found');
    }
    
    // Show remaining indexes
    const remainingIndexes = await studentsCollection.indexes();
    console.log('Remaining indexes:', remainingIndexes.map(idx => idx.name));
    
    console.log('\n✓ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

dropEnrollmentNumberIndex();
