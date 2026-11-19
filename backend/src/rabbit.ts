import amqp from "amqplib";
import type { ChannelModel, ConfirmChannel } from "amqplib";

const EXPORTS_EXCHANGE = "exports";
const RUN_QUEUE = "exports.run";
const FAILED_QUEUE = "exports.failed";

type RabbitConnection = {
  connection: ChannelModel;
  channel: ConfirmChannel;
};

export async function connectRabbit(rabbitMqUrl: string): Promise<RabbitConnection> {
  const connection = await amqp.connect(rabbitMqUrl);
  const channel = await connection.createConfirmChannel();

  try {
    await declareExportTopology(channel);
  } catch (error) {
    await channel.close().catch(() => undefined);
    await connection.close().catch(() => undefined);
    throw error;
  }

  return { connection, channel };
}

async function declareExportTopology(channel: ConfirmChannel): Promise<void> {
  await channel.assertExchange(EXPORTS_EXCHANGE, "direct", { durable: true });

  await channel.assertQueue(RUN_QUEUE, {
    durable: true,
    arguments: {
      "x-queue-type": "quorum",
      "x-delayed-retry-type": "failed",
      "x-delayed-retry-min": 5_000,
      "x-delayed-retry-max": 30_000,
      // Initial delivery plus two failed redeliveries gives three total attempts.
      "x-delivery-limit": 2,
      "x-dead-letter-exchange": EXPORTS_EXCHANGE,
      "x-dead-letter-routing-key": "failed",
    },
  });

  await channel.assertQueue(FAILED_QUEUE, {
    durable: true,
    arguments: { "x-queue-type": "quorum" },
  });

  await channel.bindQueue(RUN_QUEUE, EXPORTS_EXCHANGE, "run");
  await channel.bindQueue(FAILED_QUEUE, EXPORTS_EXCHANGE, "failed");
}
