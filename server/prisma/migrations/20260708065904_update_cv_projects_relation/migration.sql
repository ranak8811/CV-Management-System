-- AlterTable
ALTER TABLE "CV" ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'My CV',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Inactive',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "_CVToProject" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CVToProject_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CVToProject_B_index" ON "_CVToProject"("B");

-- AddForeignKey
ALTER TABLE "_CVToProject" ADD CONSTRAINT "_CVToProject_A_fkey" FOREIGN KEY ("A") REFERENCES "CV"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CVToProject" ADD CONSTRAINT "_CVToProject_B_fkey" FOREIGN KEY ("B") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
