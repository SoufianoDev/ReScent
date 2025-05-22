package com.soufianodev.rescent;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.io.IOException;
import java.util.Scanner;
import java.util.logging.Logger;
import java.util.logging.Level;

import com.soufianodev.rescent.model.ExtensionRelease;
import com.soufianodev.rescent.release.ReleaseManager;
import com.soufianodev.rescent.utils.ConsoleColors;

/**
 * Main class for the ReScent Extension Builder.
 * Cross-platform entry point for the extension builder.
 */
public class Main {    
    private static final Logger LOGGER = Logger.getLogger(Main.class.getName());
    private static final String OUTPUT_DIR = "out";
    private static final String EXTENSIONS_DIR = Paths.get(OUTPUT_DIR, "extensions").toString();
    // Use project root for releases directory
    private static final String PROJECT_ROOT = Paths.get("").toAbsolutePath().toString();
    private static final String DEFAULT_RELEASES_DIR = Paths.get(PROJECT_ROOT, "releases").toString();
    private static final String RELEASES_DIR = System.getenv("RESCENT_RELEASES_DIR") != null 
        ? System.getenv("RESCENT_RELEASES_DIR") 
        : DEFAULT_RELEASES_DIR;
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    public static void main(String[] args) {
        try {
            System.out.println(ConsoleColors.BLUE + "=== ReScent Cross-Platform Extension Builder ===" + ConsoleColors.RESET);
            System.out.println("OS: " + System.getProperty("os.name"));
            System.out.println("Releases Directory: " + RELEASES_DIR);
            
            String version;
            if (args.length < 1) {
                Scanner scanner = new Scanner(System.in);
                System.out.print(ConsoleColors.YELLOW + "Please enter version number (e.g. 1.0.0): " + ConsoleColors.RESET);
                version = scanner.nextLine().trim();
                scanner.close();
                
                if (version.isEmpty()) {
                    System.err.println(ConsoleColors.RED + "Error: Version number cannot be empty" + ConsoleColors.RESET);
                    System.exit(1);
                }
            } else {
                version = args[0].trim();
            }

            createOutputDirectories();
            
            String timestamp = LocalDateTime.now().format(DATE_FORMAT);
            String buildDir = Paths.get(EXTENSIONS_DIR, "build_" + timestamp).toString();
            
            Files.createDirectories(Paths.get(buildDir));
            System.out.println("Build directory: " + buildDir);

            Build build = new Build(buildDir);
            build.setVersion(version);
            ExtensionRelease buildRelease = build.execute();

            // Create release using ReleaseManager
            ReleaseManager releaseManager = new ReleaseManager(Paths.get(RELEASES_DIR));
            ExtensionRelease release = releaseManager.createRelease(
                version,
                buildRelease.buildPath,
                buildRelease.files
            );

            System.out.println(ConsoleColors.GREEN + "=== Build Successful ===" + ConsoleColors.RESET);
            System.out.println("Release created in: " + Paths.get(RELEASES_DIR, "v" + version));
            System.out.println("Extensions are organized in browser-specific folders within the release directory.");
        } catch (java.io.EOFException eof) {
            LOGGER.log(Level.SEVERE, "Build failed due to corrupt or incomplete CRX file: " + eof.getMessage(), eof);
            System.err.println(ConsoleColors.RED + "Build failed: The CRX file appears to be corrupt or incomplete (unexpected end of file)." + ConsoleColors.RESET);
            System.exit(1);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Build failed", e);
            System.err.println(ConsoleColors.RED + "Build failed. Check the logs for details." + ConsoleColors.RESET);
            System.exit(1);
        }
    }

    private static void createOutputDirectories() throws IOException {
        Path outputPath = Paths.get(OUTPUT_DIR);
        if (!Files.exists(outputPath)) {
            Files.createDirectories(outputPath);
        }

        Path extensionsPath = Paths.get(EXTENSIONS_DIR);
        if (!Files.exists(extensionsPath)) {
            Files.createDirectories(extensionsPath);
        }

        Path releasesPath = Paths.get(RELEASES_DIR);
        if (!Files.exists(releasesPath)) {
            Files.createDirectories(releasesPath);
        }
    }
}