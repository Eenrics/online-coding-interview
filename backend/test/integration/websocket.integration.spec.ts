import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { io, Socket } from 'socket.io-client';
import { AppModule } from '../../src/app.module';
import { Language } from '../../src/common/enums/language.enum';
import * as request from 'supertest';

describe('WebSocket Integration Tests', () => {
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
    
    // Get the actual port the server is listening on
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

  describe('WebSocket Connection', () => {
    it('should connect client to existing session', (done) => {
      // Create a session first
      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          const sessionId = response.body.id;
          const userId = 'test-user-1';
          const userName = 'Test User 1';

          const client = io(baseUrl, {
            transports: ['websocket'],
            reconnection: false,
            query: {
              sessionId,
              userId,
              userName,
            },
          });

          client.on('connect', () => {
            expect(client.connected).toBe(true);
            client.disconnect();
            done();
          });

          client.on('connect_error', (error) => {
            client.disconnect();
            done(error);
          });

          // Timeout
          setTimeout(() => {
            if (!client.connected) {
              client.disconnect();
              done(new Error('Connection timeout'));
            }
          }, 5000);
        });
    });

    it('should reject connection to non-existent session', (done) => {
      const fakeSessionId = '550e8400-e29b-41d4-a716-446655440000';
      const client = io(baseUrl, {
        transports: ['websocket'],
        query: {
          sessionId: fakeSessionId,
          userId: 'test-user',
          userName: 'Test',
        },
      });

      client.on('connect', () => {
        client.disconnect();
        done(new Error('Should not have connected'));
      });

      client.on('disconnect', () => {
        // Connection was rejected, which is expected
        done();
      });

      // Timeout if connection isn't rejected
      setTimeout(() => {
        if (client.connected) {
          client.disconnect();
          done(new Error('Connection should have been rejected'));
        }
      }, 2000);
    });

    it('should reject connection with missing parameters', (done) => {
      const client = io(baseUrl, {
        transports: ['websocket'],
        query: {
          // Missing sessionId, userId, userName
        },
      });

      client.on('connect', () => {
        client.disconnect();
        done(new Error('Should not have connected'));
      });

      client.on('disconnect', () => {
        done();
      });

      setTimeout(() => {
        if (client.connected) {
          client.disconnect();
          done(new Error('Connection should have been rejected'));
        }
      }, 2000);
    });
  });

  describe('Multiple Clients in Same Session', () => {
    it('should allow multiple clients to join same session', (done) => {
      let sessionId: string;
      const connectedClients: Socket[] = [];
      let clientsConnected = 0;
      const expectedClients = 3;

      // Create session
      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          sessionId = response.body.id;

          // Connect multiple clients
          for (let i = 0; i < expectedClients; i++) {
            const client = io(baseUrl, {
              transports: ['websocket'],
              query: {
                sessionId,
                userId: `user-${i}`,
                userName: `User ${i}`,
              },
            });

            client.on('connect', () => {
              clientsConnected++;
              connectedClients.push(client);

              if (clientsConnected === expectedClients) {
                // All clients connected
                expect(connectedClients.length).toBe(expectedClients);
                
                // Cleanup
                connectedClients.forEach((c) => c.disconnect());
                done();
              }
            });

            client.on('connect_error', (error) => {
              connectedClients.forEach((c) => c.disconnect());
              done(error);
            });
          }
        });
    });

    it('should broadcast user-joined event to other clients', (done) => {
      let sessionId: string;
      const userJoinedEvents: any[] = [];

      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          sessionId = response.body.id;

          // First client
          const client1 = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'user-1',
              userName: 'User 1',
            },
          });

          client1.on('connect', () => {
            // Second client - should trigger user-joined on client1
            const client2 = io(baseUrl, {
              transports: ['websocket'],
              query: {
                sessionId,
                userId: 'user-2',
                userName: 'User 2',
              },
            });

            client1.on('user-joined', (message) => {
              userJoinedEvents.push(message);
              expect(message.type).toBe('user-joined');
              expect(message.userId).toBe('user-2');
              expect(message.payload).toHaveProperty('id', 'user-2');
              expect(message.payload).toHaveProperty('name', 'User 2');
              expect(message.payload).toHaveProperty('color');

              client1.disconnect();
              client2.disconnect();
              done();
            });

            client2.on('connect', () => {
              // Client2 connected, should trigger user-joined on client1
            });
          });
        });
    });
  });

  describe('Code Update Synchronization', () => {
    it('should broadcast code updates to all clients in session', (done) => {
      let sessionId: string;
      const receivedUpdates: any[] = [];

      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          sessionId = response.body.id;

          // Client 1 - will send update
          const client1 = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'sender',
              userName: 'Sender',
            },
          });

          // Client 2 - will receive update
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
              // Listen for code updates on client2
              client2.on('code-update', (message) => {
                receivedUpdates.push(message);
                expect(message.type).toBe('code-update');
                expect(message.userId).toBe('sender');
                expect(message.payload).toHaveProperty('delta');
                expect(message.payload).toHaveProperty('version');

                client1.disconnect();
                client2.disconnect();
                done();
              });

              // Send code update from client1
              setTimeout(() => {
                client1.emit('code-update', {
                  type: 'code-update',
                  sessionId,
                  userId: 'sender',
                  payload: {
                    delta: { fullCode: 'console.log("test");' },
                    version: 1,
                  },
                  timestamp: Date.now(),
                });
              }, 100);
            });
          });
        });
    });

    it('should not send code update back to sender', (done) => {
      let sessionId: string;
      let updateReceived = false;

      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          sessionId = response.body.id;

          const client = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'sender',
              userName: 'Sender',
            },
          });

          client.on('connect', () => {
            // Listen for code updates (should not receive own updates)
            client.on('code-update', () => {
              updateReceived = true;
            });

            // Send code update
            client.emit('code-update', {
              type: 'code-update',
              sessionId,
              userId: 'sender',
              payload: {
                delta: { fullCode: 'test' },
                version: 1,
              },
              timestamp: Date.now(),
            });

            // Wait a bit to ensure no update is received
            setTimeout(() => {
              expect(updateReceived).toBe(false);
              client.disconnect();
              done();
            }, 500);
          });
        });
    });
  });

  describe('Language Change Synchronization', () => {
    it('should broadcast language changes to all clients', (done) => {
      let sessionId: string;
      const languageChanges: any[] = [];

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
              userId: 'user-1',
              userName: 'User 1',
            },
          });

          const client2 = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'user-2',
              userName: 'User 2',
            },
          });

          client1.on('connect', () => {
            client2.on('connect', () => {
              client2.on('language-changed', (message) => {
                languageChanges.push(message);
                expect(message.type).toBe('language-changed');
                expect(message.payload).toBe(Language.TYPESCRIPT);

                client1.disconnect();
                client2.disconnect();
                done();
              });

              // Change language from client1
              setTimeout(() => {
                client1.emit('language-changed', {
                  type: 'language-changed',
                  sessionId,
                  userId: 'user-1',
                  payload: Language.TYPESCRIPT,
                  timestamp: Date.now(),
                });
              }, 100);
            });
          });
        });
    });

    it('should reject invalid language', (done) => {
      let sessionId: string;

      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          sessionId = response.body.id;

          const client = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'user-1',
              userName: 'User 1',
            },
          });

          client.on('connect', () => {
            let errorReceived = false;

            client.on('error', (message) => {
              errorReceived = true;
              expect(message.payload.error).toBe('INVALID_LANGUAGE');
              client.disconnect();
              done();
            });

            // Send invalid language
            client.emit('language-changed', {
              type: 'language-changed',
              sessionId,
              userId: 'user-1',
              payload: 'invalid-language',
              timestamp: Date.now(),
            });

            setTimeout(() => {
              if (!errorReceived) {
                client.disconnect();
                done(new Error('Should have received error'));
              }
            }, 1000);
          });
        });
    });
  });

  describe('Presence Updates', () => {
    it('should send presence update when user joins', (done) => {
      let sessionId: string;
      let presenceUpdateReceived = false;

      request(server)
        .post('/api/sessions')
        .send({ language: Language.JAVASCRIPT })
        .expect(201)
        .then((response) => {
          sessionId = response.body.id;

          const client = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'user-1',
              userName: 'User 1',
            },
          });

          client.on('connect', () => {
            client.on('presence-update', (message) => {
              presenceUpdateReceived = true;
              expect(message.type).toBe('presence-update');
              expect(message.payload).toHaveProperty('users');
              expect(Array.isArray(message.payload.users)).toBe(true);

              client.disconnect();
              done();
            });
          });
        });
    });
  });

  describe('Disconnection Handling', () => {
    it('should broadcast user-left when client disconnects', (done) => {
      let sessionId: string;

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
              userId: 'user-1',
              userName: 'User 1',
            },
          });

          const client2 = io(baseUrl, {
            transports: ['websocket'],
            query: {
              sessionId,
              userId: 'user-2',
              userName: 'User 2',
            },
          });

          client1.on('connect', () => {
            client2.on('connect', () => {
              let userLeftReceived = false;

              client2.on('user-left', (message) => {
                userLeftReceived = true;
                expect(message.type).toBe('user-left');
                expect(message.userId).toBe('user-1');

                client2.disconnect();
                done();
              });

              // Disconnect client1
              setTimeout(() => {
                client1.disconnect();
              }, 100);

              // Timeout if user-left not received
              setTimeout(() => {
                if (!userLeftReceived) {
                  client2.disconnect();
                  done(new Error('user-left event not received'));
                }
              }, 2000);
            });
          });
        });
    });
  });

  describe('Rate Limiting', () => {
    it('should throttle rapid code updates', (done) => {
      let sessionId: string;
      let updateCount = 0;

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
              userId: 'sender',
              userName: 'Sender',
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
              client2.on('code-update', () => {
                updateCount++;
              });

              // Send many rapid updates
              for (let i = 0; i < 10; i++) {
                client1.emit('code-update', {
                  type: 'code-update',
                  sessionId,
                  userId: 'sender',
                  payload: {
                    delta: { fullCode: `code-${i}` },
                    version: i + 1,
                  },
                  timestamp: Date.now(),
                });
              }

              // Wait and check that not all updates were received (throttled)
              setTimeout(() => {
                // Should receive some but not all due to throttling
                expect(updateCount).toBeLessThan(10);
                client1.disconnect();
                client2.disconnect();
                done();
              }, 1000);
            });
          });
        });
    });
  });
});

