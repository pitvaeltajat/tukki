-- Persist Tukki administrator membership instead of deriving it from env vars.
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER');

ALTER TABLE "User" ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER';
