import * as fs from "node:fs/promises";
import path from "node:path";
import type { SessionFsProvider } from "@github/copilot-sdk";

export function createLocalSessionFsProvider(
  rootDirectory: string,
): SessionFsProvider {
  const root = path.resolve(rootDirectory);

  const resolvePath = (virtualPath: string) => {
    const normalized = path.posix
      .normalize(`/${virtualPath}`)
      .replace(/^\/+/, "");

    return path.join(root, ...normalized.split("/").filter(Boolean));
  };

  const ensureParentDirectory = async (filePath: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  };

  return {
    async readFile(virtualPath) {
      return fs.readFile(resolvePath(virtualPath), "utf8");
    },

    async writeFile(virtualPath, content, mode) {
      const filePath = resolvePath(virtualPath);
      await ensureParentDirectory(filePath);
      await fs.writeFile(filePath, content, {
        encoding: "utf8",
        mode,
      });
    },

    async appendFile(virtualPath, content, mode) {
      const filePath = resolvePath(virtualPath);
      await ensureParentDirectory(filePath);
      await fs.appendFile(filePath, content, {
        encoding: "utf8",
        mode,
      });
    },

    async exists(virtualPath) {
      try {
        await fs.access(resolvePath(virtualPath));
        return true;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return false;
        }
        throw error;
      }
    },

    async stat(virtualPath) {
      const result = await fs.stat(resolvePath(virtualPath));

      return {
        isFile: result.isFile(),
        isDirectory: result.isDirectory(),
        size: result.size,
        mtime: result.mtime.toISOString(),
        birthtime: result.birthtime.toISOString(),
      };
    },

    async mkdir(virtualPath, recursive, mode) {
      await fs.mkdir(resolvePath(virtualPath), {
        recursive,
        mode,
      });
    },

    async readdir(virtualPath) {
      return fs.readdir(resolvePath(virtualPath));
    },

    async readdirWithTypes(virtualPath) {
      const directoryPath = resolvePath(virtualPath);
      const names = await fs.readdir(directoryPath);

      return Promise.all(
        names.map(async (name) => {
          const result = await fs.stat(path.join(directoryPath, name));

          return {
            name,
            type: result.isDirectory()
              ? ("directory" as const)
              : ("file" as const),
          };
        }),
      );
    },

    async rm(virtualPath, recursive, force) {
      await fs.rm(resolvePath(virtualPath), {
        recursive,
        force,
      });
    },

    async rename(source, destination) {
      const destinationPath = resolvePath(destination);
      await ensureParentDirectory(destinationPath);
      await fs.rename(resolvePath(source), destinationPath);
    },
  };
}
