import { Command } from "commander";
import { eodCommand } from "./commands/eod";
import { loginCommand } from "./commands/login";
import { reposCommand } from "./commands/repos";
import { statusCommand } from "./commands/status";
import { syncCommand } from "./commands/sync";
import { todayCommand } from "./commands/today";

const program = new Command();

program
	.name("wlog")
	.description("Your daily engineering digest from the terminal")
	.version("0.1.0");

program
	.command("login")
	.description("Authenticate with wlog (opens browser)")
	.option("--logout", "Remove stored credentials")
	.action((opts) => loginCommand(opts));

program
	.command("status")
	.description("Show your connection and account status")
	.action(() => statusCommand());

program
	.command("sync")
	.description("Trigger a manual pull and wait for it to complete")
	.action(() => syncCommand());

program
	.command("today")
	.description("Print today's standup")
	.action(() => todayCommand());

program
	.command("eod")
	.description("Print today's EOD digest")
	.option("--export", "Save to eod-YYYY-MM-DD.md in the current directory")
	.action((opts) => eodCommand(opts));

const repos = program
	.command("repos")
	.description("Manage tracked GitHub repositories");

repos
	.command("list")
	.description("List all repos and which are tracked")
	.action(() => reposCommand("list"));

repos
	.command("add <name>")
	.description("Start tracking a repo (use full name, e.g. owner/repo)")
	.action((name: string) => reposCommand("add", name));

repos
	.command("remove <name>")
	.description("Stop tracking a repo")
	.action((name: string) => reposCommand("remove", name));

program.parse();
