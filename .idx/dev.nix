{ pkgs, ... }: {
  # NixOS channel to use.
  channel = "stable-24.11";

  # Packages to install.
  packages = [
    pkgs.nodejs_22
    pkgs.pnpm
  ];

  # VS Code extensions to install.
  idx.extensions = [
    "dbaeumer.vscode-eslint"
  ];

  # Workspace lifecycle hooks.
  idx.workspace = {
    # Runs when a workspace is first created.
    onCreate = {
      install-deps = "pnpm install --frozen-lockfile";
    };
    # Runs every time the workspace is (re)started.
    onStart = {
      start-dev-server = "pnpm run dev";
    };
  };

  # Web preview configuration.
  idx.previews = {
    enable = true;
    previews = {
      web = {
        command = ["pnpm" "run" "dev" "--" "--port" "$PORT"];
        manager = "web";
      };
    };
  };
}
