import mongoose from 'mongoose';

const run = async () => {
    try {

        await mongoose.connect(process.env.uri, { dbName: 'CareSync' });
        console.log(`Connected to database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('Not connected to database:', error);
        throw error;
    }
};

export { run };