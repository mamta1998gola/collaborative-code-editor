import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import vm from 'node:vm';
import { argsMapper } from './utils';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "https://collaborative-code-editor-ui.vercel.app/", // Vite default port
        methods: ["GET", "POST"]
    }
});

app.use(cors());

app.get('/', (req, res) => {
    res.send('Server is running');
});

const rooms: { [key: string]: string } = {};

io.on('connection', (socket: Socket) => {
    console.log('A user connected');

    socket.on('createRoom', (roomId: string) => {
        rooms[roomId] = '';
        socket.join(roomId);
        console.log(`Room created: ${roomId}`);
    });

    socket.on('joinRoom', (roomId: string) => {
        if (rooms.hasOwnProperty(roomId)) {
            socket.join(roomId);
            socket.emit('codeUpdate', rooms[roomId]);
            console.log(`User joined room: ${roomId}`);
        } else {
            socket.emit('error', 'Room does not exist');
        }
    });

    socket.on('codeChange', ({ roomId, code }: { roomId: string; code: string }) => {
        rooms[roomId] = code;
        socket.to(roomId).emit('codeUpdate', code);
    });

    socket.on('compile', ({ roomId, code }: { roomId: string; code: string }) => {
        const compiledCode = new Promise((resolve, reject) => {
            const sandbox: {
                console: {
                    log: (...args: unknown[]) => void;
                };
                output?: string;
            } = {
                console: {
                    log: (...args: unknown[]) => {
                        if (!sandbox.output) {
                            sandbox.output = '';
                        }
                        sandbox.output += argsMapper(args);
                    },
                },
            };

            const context = vm.createContext(sandbox);
            const wrappedCode = `(() => { ${code} })();`;

            try {
                vm.runInContext(wrappedCode, context);
                rooms[roomId] = sandbox.output ?? ''
                resolve(sandbox.output ?? 'No console output');
            } catch (error) {
                reject(new Error(`Some error occured: ${error}`));
            }
        });

        compiledCode
            .then((result) => {
                // Emit the result to all users in the room, including the sender
                io.to(roomId).emit('compileResult', result);
            })
            .catch((error) => {
                // Emit the error to all users in the room, including the sender
                io.to(roomId).emit('compileResult', { error: error.message });
            });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
