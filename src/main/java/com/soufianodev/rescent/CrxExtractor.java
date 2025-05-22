package com.soufianodev.rescent;

import java.io.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * CrxExtractor is responsible for extracting CRX and XPI files (which are ZIPs).
 */
public class CrxExtractor {
    public void extractCrx(String crxPath, String outputDir) throws IOException {
        extractZipContent(crxPath, outputDir);
    }

    public void extractXpi(String xpiPath, String outputDir) throws IOException {
        extractZipContent(xpiPath, outputDir);
    }

    private void extractZipContent(String zipPath, String outputDir) throws IOException {
        File dir = new File(outputDir);
        if (!dir.exists()) dir.mkdirs();

        try (ZipInputStream zis = new ZipInputStream(new FileInputStream(zipPath))) {
            ZipEntry entry;
            boolean extracted = false;
            while ((entry = zis.getNextEntry()) != null) {
                File newFile = new File(outputDir, entry.getName());
                if (entry.isDirectory()) {
                    newFile.mkdirs();
                } else {
                    new File(newFile.getParent()).mkdirs();
                    try (FileOutputStream fos = new FileOutputStream(newFile)) {
                        byte[] buffer = new byte[8192];
                        int len;
                        while ((len = zis.read(buffer)) > 0) {
                            fos.write(buffer, 0, len);
                        }
                    }
                }
                extracted = true;
            }
            if (!extracted) {
                throw new IOException("No files extracted");
            }
        }
    }
}