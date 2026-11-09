-- Workspace sync deactivates users without destroying their local history.
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deletedBySync" BOOLEAN NOT NULL DEFAULT false;
