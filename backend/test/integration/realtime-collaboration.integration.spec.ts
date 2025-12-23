import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../../src/app.module';
import { Language } from '../../src/common/enums/language.enum';
import * as request from 'supertest';

describe('Real-Time Collaboration Integration Tests', () => {
  let app: INestApplication;
  let server: any;
  let baseUrl: string;
  let port: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    server = app.getHttpServer();
    
    const address = server.address();
    if (address && typeof address !== 'string') {
      port = address.port;
    } else {
      port = 3001;
    }
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Code Synchronization', () => {
    it('should synchronize code changes between multiple clients', (done) => {
      let sessionId: string;
      const codeUpdates: string[] = [];

      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          sessionId = response.body.id;

          const clientA = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'client-a',
              userName: 'Client A',
            },
          });

          const clientB = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'client-b',
              userName: 'Client B',
            },
          });

          clientA.on('connect', () => {
            clientB.on('connect', () => {
              // Client B listens for updates
              clientB.on('code-update', (message) => {
                if (message.userId === 'client-a') {
                  const delta = message.payload.delta as { fullCode?: string };
                  if (delta.fullCode) {
                    codeUpdates.push(delta.fullCode);
                  }
                }
              });

              // Client A sends code update
              setTimeout(() => {
                const testCode = 'const x = 42;';
                clientA.emit('code-update', {
                  type: 'code-update',
                  sessionId,
                  userId: 'client-a',
                  payload: {
                    delta: { fullCode: testCode },
                    version: 1,
                  },
                  timestamp: Date.now(),
                });

                // Verify update received
                setTimeout(() => {
                  expect(codeUpdates.length).toBeGreaterThan(0);
                  expect(codeUpdates[0]).toBe(testCode);
                  
                  clientA.disconnect();
                  clientB.disconnect();
                  done();
                }, 200);
              }, 100);
            });
          });
        });
    });

    it('should handle concurrent edits from multiple clients', (done) => {
      let sessionId: string;
      const updates: any[] = [];

      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          sessionId = response.body.id;

          const client1 = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'client-1',
              userName: 'Client 1',
            },
          });

          const client2 = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'client-2',
              userName: 'Client 2',
            },
          });

          const client3 = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'client-3',
              userName: 'Client 3',
            },
          });

          let connectedCount = 0;
          const onConnect = () => {
            connectedCount++;
            if (connectedCount === 3) {
              // All connected, start sending updates
              client1.on('code-update', (msg) => {
                if (msg.userId !== 'client-1') updates.push(msg);
              });
              client2.on('code-update', (msg) => {
                if (msg.userId !== 'client-2') updates.push(msg);
              });
              client3.on('code-update', (msg) => {
                if (msg.userId !== 'client-3') updates.push(msg);
              });

              // Send concurrent updates
              client1.emit('code-update', {
                type: 'code-update',
                sessionId,
                userId: 'client-1',
                payload: { delta: { fullCode: 'code1' }, version: 1 },
                timestamp: Date.now(),
              });

              client2.emit('code-update', {
                type: 'code-update',
                sessionId,
                userId: 'client-2',
                payload: { delta: { fullCode: 'code2' }, version: 2 },
                timestamp: Date.now(),
              });

              client3.emit('code-update', {
                type: 'code-update',
                sessionId,
                userId: 'client-3',
                payload: { delta: { fullCode: 'code3' }, version: 3 },
                timestamp: Date.now(),
              });

              // Verify updates received
              setTimeout(() => {
                // Each client should receive updates from the other 2
                expect(updates.length).toBeGreaterThan(0);
                
                client1.disconnect();
                client2.disconnect();
                client3.disconnect();
                done();
              }, 500);
            }
          };

          client1.on('connect', onConnect);
          client2.on('connect', onConnect);
          client3.on('connect', onConnect);
        });
    });
  });

  describe('Late Joining Client', () => {
    it('should receive current session state when joining late', (done) => {
      let sessionId: string;
      let initialCode = 'const initial = true;';

      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          sessionId = response.body.id;

          // First client joins and sends code
          const client1 = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'early-joiner',
              userName: 'Early',
            },
          });

          client1.on('connect', () => {
            // Send initial code
            client1.emit('code-update', {
              type: 'code-update',
              sessionId,
              userId: 'early-joiner',
              payload: {
                delta: { fullCode: initialCode },
                version: 1,
              },
              timestamp: Date.now(),
            });

            // Second client joins later
            setTimeout(() => {
              const client2 = io(baseUrl, {
                transports: ['websocket'],
                query: {
                  sessionId,
                  userId: 'late-joiner',
                  userName: 'Late',
                },
              });

              client2.on('connect', () => {
                // Late joiner should receive presence update
                client2.on('presence-update', (message) => {
                  expect(message.payload.users.length).toBeGreaterThan(0);
                  
                  client1.disconnect();
                  client2.disconnect();
                  done();
                });
              });
            }, 200);
          });
        });
    });
  });

  describe('Language Change Propagation', () => {
    it('should update all clients when language changes', (done) => {
      let sessionId: string;
      const languageChanges: Language[] = [];

      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          sessionId = response.body.id;

          const client1 = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'changer',
              userName: 'Changer',
            },
          });

          const client2 = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'receiver',
              userName: 'Receiver',
            },
          });

          client1.on('connect', () => {
            client2.on('connect', () => {
              client2.on('language-changed', (message) => {
                languageChanges.push(message.payload);
                expect(message.payload).toBe(Language.PYTHON);

                client1.disconnect();
                client2.disconnect();
                done();
              });

              // Change language
              setTimeout(() => {
                client1.emit('language-changed', {
                  type: 'language-changed',
                  sessionId,
                  userId: 'changer',
                  payload: Language.PYTHON,
                  timestamp: Date.now(),
                });
              }, 100);
            });
          });
        });
    });
  });
});

