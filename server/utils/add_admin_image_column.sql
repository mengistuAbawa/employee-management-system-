-- Add image column to admin table for profile images
-- Run this in phpMyAdmin or MySQL CLI

ALTER TABLE admin ADD COLUMN image VARCHAR(255) DEFAULT NULL;
