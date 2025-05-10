// backend/src/db.ts
import { PrismaClient } from '@prisma/client';

console.log('[DB_INIT]: db.ts - Top of file.');
let prisma: PrismaClient;

try {
    console.log(`[DB_INIT]: Attempting to initialize PrismaClient. DATABASE_URL starts with: ${process.env.DATABASE_URL?.substring(0, 30)}...`); // Log part of the URL for verification without exposing full creds
    
    prisma = new PrismaClient({
        log: [ // More detailed logging from Prisma
            { emit: 'stdout', level: 'query' },
            { emit: 'stdout', level: 'info' },
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
        ],
    });
    console.log('[DB_INIT]: PrismaClient instance created.');

    // Asynchronous self-invoking function to test connection
    (async () => {
        try {
            console.log('[DB_INIT]: Attempting prisma.$connect()...');
            await prisma.$connect();
            console.log('[DB_INIT]: Prisma connected to the database successfully.');
        } catch (connectError) {
            console.error('[DB_INIT]: FATAL ERROR - Prisma FAILED to connect to the database:', connectError);
            // If connection fails, the app might not be usable.
            // Consider if you want to exit here for Render to restart, or let it continue and fail later.
            // For debugging, letting it continue might show more context in server.ts logs.
            // process.exit(1); // Uncomment if you want to force exit on DB connection failure
        }
    })();

} catch (initError) {
    console.error('[DB_INIT]: FATAL ERROR - Exception during PrismaClient instantiation:', initError);
    // This kind of error is less common than connection errors but possible.
    process.exit(1); // Definitely exit if the client itself can't be created.
}

// Ensure prisma is exported even if the async connection test is pending or fails,
// unless you exit above. If it's undefined here, it means the try block for instantiation failed.
if (!prisma) {
    console.error("[DB_INIT]: Prisma instance is undefined after try-catch. This shouldn't happen if process.exit(1) is used on error.");
    // Fallback or re-throw to ensure app doesn't continue in a broken state
    throw new Error("Prisma client could not be initialized.");
}

export default prisma;