-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "code6D" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "sublocality" TEXT,
    "locality" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Address_code6D_key" ON "Address"("code6D");

-- CreateIndex
CREATE UNIQUE INDEX "Address_mobile_key" ON "Address"("mobile");

-- CreateIndex
CREATE INDEX "Address_mobile_idx" ON "Address"("mobile");
