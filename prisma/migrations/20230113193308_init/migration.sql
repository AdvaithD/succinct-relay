-- CreateTable
CREATE TABLE "ArbitraryMessage" (
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "id" SERIAL NOT NULL,
    "fromAddress" VARCHAR(255) NOT NULL,
    "toAddress" VARCHAR(255) NOT NULL,
    "value" INTEGER NOT NULL,
    "data" VARCHAR(255) NOT NULL,
    "signature" VARCHAR(255) NOT NULL,
    "sourceNetwork" VARCHAR(255) NOT NULL,
    "targetNetwork" VARCHAR(255) NOT NULL,

    CONSTRAINT "ArbitraryMessage_pkey" PRIMARY KEY ("id")
);
