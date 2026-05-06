import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
neonConfig.poolQueryViaFetch = true;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });
  }

  async onModuleInit() {
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        await this.$connect();
        this.logger.log('Database connected successfully <3');
        return;
      } catch (error) {
        attempt++;
        this.logger.warn(
          `!!! Attempt ${attempt}/${maxRetries} failed. Retrying in 3s...`,
        );
        if (attempt >= maxRetries) {
          this.logger.error('Ooops Could not connect after max retries');
          throw error;
        }
        await new Promise((res) => setTimeout(res, 3000));
      }
    }
  }
}
