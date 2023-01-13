import { PrismaClient, ArbitraryMessage } from "@prisma/client";

export const prisma = new PrismaClient();

export const createArbitraryMessage = async (payload: any) => {
  const dbData = {
    data: String(payload.data),
    signature: String(payload.signature),
    fromAddress: String(payload.fromAddress),
    toAddress: String(payload.toAddress),
    value: Number(payload.value),
    sourceNetwork: String(payload.sourceNetwork),
    targetNetwork: String(payload.targetNetwork),
  };

  return await prisma.arbitraryMessage.create({
    data: {
      ...dbData,
    },
  });
};
