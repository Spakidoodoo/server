import app from './app.js';
import {prisma} from './config/prisma.js'; // example

async function startServer() {
  try {
    await prisma.$connect(); // Connect to DB first
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
