import mongoose from 'mongoose';

const run = async () => {
    try {
        // `dbName` is the correct way to select a specific database — it works
        // regardless of what (if anything) follows the host in `uri`.
        // The previous `mongoose.connection.useDb('CareSync')` call created a
        // second, unused Connection object and had zero effect on which
        // database your models (User, Order, etc.) actually read/write to.
        await mongoose.connect(process.env.uri, { dbName: 'CareSync' });
        console.log(`Connected to database: ${mongoose.connection.name}`);
    } catch (error) {
        console.error('Not connected to database:', error);
        throw error;
    }
};

export { run };
