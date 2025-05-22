package com.soufianodev.rescent;

import com.soufianodev.rescent.model.BrowserType;
import com.soufianodev.rescent.model.ExtensionRelease;
import com.soufianodev.rescent.model.ExtensionVersion;
import java.io.*;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Build class responsible for orchestrating the extension building process.
 * This class manages the creation and extraction of extension files.
 */
public class Build {
    private final String buildDirectory;
    private final String extensionName;
    private final CrxCreator crxCreator;
    private final CrxExtractor crxExtractor;
    private final String sourceDir;
    private ExtensionVersion version;

    /**
     * Constructs a new Build instance with the specified build directory.
     *
     * @param buildDirectory The directory where build artifacts will be stored
     */
    public Build(String buildDirectory) {
        this.buildDirectory = buildDirectory;
        this.extensionName = "ReScent";
        this.crxCreator = new CrxCreator();
        this.crxExtractor = new CrxExtractor();
        this.sourceDir = "src/main/resources/extension";
    }

    /**
     * Sets the version for this build.
     *
     * @param version The version string in format "x.y.z"
     */
    public void setVersion(String version) {
        this.version = ExtensionVersion.Companion.fromString(version);
    }

    /**
     * Executes the complete build process.
     * This includes creating the CRX file and extracting it for verification.
     *
     * @return ExtensionRelease containing information about the built extensions
     * @throws Exception if any step of the build process fails
     */
    public ExtensionRelease execute() throws Exception {
        if (version == null) {
            throw new IllegalStateException("Version must be set before executing build");
        }

        System.out.println("[Build] Starting build process...");
        System.out.println("[Build] Source directory: " + sourceDir);
        System.out.println("[Build] Version: " + version);

        // Verify source directory exists
        File sourceDirFile = new File(sourceDir);
        if (!sourceDirFile.exists()) {
            throw new IOException("Source directory not found: " + sourceDir);
        }

        // Create browser paths and extension files maps
        Map<BrowserType, Path> browserPaths = new HashMap<>();
        Map<BrowserType, Path> extensionFiles = new HashMap<>();

        // Process each browser type
        for (BrowserType browser : BrowserType.values()) {
            // Create browser directory
            String dirName = browser.name().toLowerCase();
            browserPaths.put(browser, Paths.get(createBrowserDir(dirName)));

            // Create browser-specific extension file
            String extensionPath;
            if (browser == BrowserType.FIREFOX) {
                extensionPath = createXpiFile(browserPaths.get(browser).toString());
            } else {
                extensionPath = createCrxFile(browserPaths.get(browser).toString(), dirName);
            }
            extensionFiles.put(browser, Paths.get(extensionPath));

            // Extract and verify
            extractAndVerify(extensionPath, browserPaths.get(browser).toString());
        }

        System.out.println("[Build] Build process completed successfully.");

        // Create and return ExtensionRelease
        return new ExtensionRelease(
            version,
            LocalDateTime.now(),
            kotlin.collections.MapsKt.toMap(extensionFiles), // Convert Java Map to Kotlin Map
            Paths.get(buildDirectory)
        );
    }

    private String createBrowserDir(String browser) throws Exception {
        String dir = Paths.get(buildDirectory, browser).toString();
        new File(dir).mkdirs();
        return dir;
    }

    private String createCrxFile(String browserDir, String browser) throws Exception {
        String crxPath = Paths.get(browserDir, extensionName + "_" + browser + ".crx").toString();
        crxCreator.createCrxFile(sourceDir, crxPath);
        System.out.println("[Build] Created CRX file for " + browser + ": " + crxPath);
        return crxPath;
    }

    private String createXpiFile(String browserDir) throws Exception {
        String xpiPath = Paths.get(browserDir, extensionName + "_firefox.xpi").toString();
        File tempDir = new File(browserDir, "temp_firefox");
        if (!tempDir.exists()) {
            tempDir.mkdirs();
        }

        try {
            copyExtensionFiles(new File(sourceDir), tempDir);
            crxCreator.createCrxFile(tempDir.getPath(), xpiPath);
            System.out.println("[Build] Created XPI file for Firefox: " + xpiPath);
            return xpiPath;
        } finally {
            deleteDirectory(tempDir);
        }
    }

    private void extractAndVerify(String extensionPath, String outputDir) throws Exception {
        crxExtractor.extractCrx(extensionPath, outputDir);
        System.out.println("[Build] Extracted " + extensionPath + " to " + outputDir);
    }

    private void copyExtensionFiles(File source, File target) throws IOException {
        if (source.isDirectory()) {
            if (!target.exists()) {
                target.mkdirs();
            }

            String[] files = source.list();
            if (files != null) {
                for (String file : files) {
                    File srcFile = new File(source, file);
                    File destFile = new File(target, file);
                    copyExtensionFiles(srcFile, destFile);
                }
            }
        } else {
            try (InputStream in = new FileInputStream(source);
                 OutputStream out = new FileOutputStream(target)) {
                byte[] buffer = new byte[8192];
                int length;
                while ((length = in.read(buffer)) > 0) {
                    out.write(buffer, 0, length);
                }
            }
        }
    }

    private void deleteDirectory(File directory) {
        File[] files = directory.listFiles();
        if (files != null) {
            for (File file : files) {
                if (file.isDirectory()) {
                    deleteDirectory(file);
                } else {
                    file.delete();
                }
            }
        }
        directory.delete();
    }
}