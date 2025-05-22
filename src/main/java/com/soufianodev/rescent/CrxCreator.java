package com.soufianodev.rescent;

import java.io.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * CrxCreator is responsible for creating a CRX file (Chrome extension package).
 * This implementation simply zips the extension directory as a .crx file.
 */
public class CrxCreator {
    public void createCrxFile(String sourceDir, String crxPath) throws IOException {
        File sourceFolder = new File(sourceDir);
        if (!sourceFolder.exists() || !sourceFolder.isDirectory()) {
            throw new IOException("Source directory does not exist: " + sourceDir);
        }

        try (FileOutputStream fos = new FileOutputStream(crxPath);
             ZipOutputStream zos = new ZipOutputStream(fos)) {
            zipDirectory(sourceFolder, sourceFolder, zos);
        }
    }

    private void zipDirectory(File rootDir, File source, ZipOutputStream zos) throws IOException {
        if (source.isDirectory()) {
            for (File file : source.listFiles()) {
                zipDirectory(rootDir, file, zos);
            }
        } else {
            String entryName = rootDir.toPath().relativize(source.toPath()).toString();
            ZipEntry entry = new ZipEntry(entryName);
            zos.putNextEntry(entry);

            try (FileInputStream fis = new FileInputStream(source)) {
                byte[] buffer = new byte[8192];
                int length;
                while ((length = fis.read(buffer)) > 0) {
                    zos.write(buffer, 0, length);
                }
            }
            zos.closeEntry();
        }
    }
}