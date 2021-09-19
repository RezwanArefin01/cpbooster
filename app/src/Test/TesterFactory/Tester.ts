/*
    cpbooster "Competitive Programming Booster"
    Copyright (C) 2020  Sergio G. Sanchez V.

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import Config from "../../Config/Config";
import { Veredict } from "../../Types/Veredict";
import Util from "../../Utils/Util";
import * as fs from "fs";
import { exit } from "process";
import chalk from "chalk";
import { spawnSync } from "child_process";
import * as Path from "path";

export default abstract class Tester {
  config: Config;
  filePath: string;
  langExtension: string;

  constructor(config: Config, filePath: string) {
    if (!fs.existsSync(filePath)) {
      console.log(`File not found: ${filePath}`);
      exit(0);
    }
    this.config = config;
    this.filePath = filePath;
    this.langExtension = Path.extname(this.filePath).slice(1).toLowerCase();
  }

  abstract testOne(testId: number, compile: boolean): Veredict;

  abstract debugOne(testId: number, compile: boolean): void;

  abstract debugWithUserInput(compile: boolean): void;

  testAll(compile: boolean): void {
    const testcasesIds = Tester.getTestCasesIds(this.filePath);
    if (testcasesIds.length == 0) {
      console.log("No testcases available for this file:", this.filePath);
      exit(0);
    }
    let acCnt = this.testOne(testcasesIds[0], compile) === Veredict.AC ? 1 : 0;
    for (let i = 1; i < testcasesIds.length; i++) {
      acCnt += this.testOne(testcasesIds[i], false) === Veredict.AC ? 1 : 0;
    }
    Tester.printScore(acCnt, testcasesIds.length);
  }

  extractTimeLimit(): number {
    const text = fs.readFileSync(this.filePath).toString();
    const commentString = Util.getCommentString(this.langExtension, this.config);
    const re = new RegExp(String.raw`^\s*${commentString}\s*time-limit\s*:\s*([0-9]+)\s*$`, "gm");
    const match = re.exec(text);
    let time = 3000; // Default time
    if (match) {
      time = parseInt(match[1]);
    }
    return time;
  }

 printTestResults(testId: number): Veredict {
    let inputFilePath = Tester.getInputPath(this.filePath, testId);
    let outputFilePath = Tester.getOutputPath(this.filePath, testId);
    let answerFilePath = Tester.getAnswerPath(this.filePath, testId);
    if (!fs.existsSync(inputFilePath)) {
      console.log("input file not found in", outputFilePath);
      return Veredict.RTE;
    }
    if (!fs.existsSync(outputFilePath)) {
      console.log("output file not found in", outputFilePath);
      return Veredict.RTE;
    }
    if (!fs.existsSync(answerFilePath)) {
      console.log("answer file not found in", answerFilePath);
      return Veredict.RTE;
    }

    const input = fs.readFileSync(inputFilePath).toString();
    const output = fs.readFileSync(outputFilePath).toString();
    const ans = fs.readFileSync(answerFilePath).toString();
    const trimmedOutput = output.trim();
    const trimmedAns = ans.trim();
    const outputLines = trimmedOutput.split("\n");
    const ansLines = trimmedAns.split("\n");

    const trimmedOutputLines = outputLines.map((item) => {
      return item.trim(); // remove '\r' char if exists
    });
    const trimmedAnsLines = ansLines.map((item) => {
      return item.trim(); // remove '\r' char if exists
    });

    const isTrimmedOutputSame =
      trimmedOutputLines.length === trimmedAnsLines.length &&
      Util.sequence(0, trimmedAnsLines.length).every(
        (index) => trimmedOutputLines[index] === trimmedAnsLines[index]
      );

    if (isTrimmedOutputSame) {
      console.log(`Test Case ${testId}:`, chalk.bgGreen(chalk.whiteBright(" A C ")));
      if (ans !== output) {
        console.log(chalk.yellow("Check leading and trailing blank spaces") + "\n");
      }

      let inputLines = input.split("\n");
      let outputLines = output.split("\n");
      let maxInputWidth = 0;
      for (let i = 0; i < inputLines.length; i++) {
        if (inputLines[i].length > maxInputWidth) {
          maxInputWidth = inputLines[i].length;
        }
      }
      let columnWidth = Math.min(Math.max(maxInputWidth, 16), process.stdout.columns - 8);
      let leftHeader = chalk.whiteBright.bgGray(Util.padCenter("Input", columnWidth));
      let rightHeader = chalk.whiteBright.bgGray(Util.padCenter("Output", columnWidth));
      console.log(leftHeader + "|" + rightHeader);
      for (let i = 0; i < Math.max(inputLines.length, outputLines.length); i++) {
        let line = "";
        if (i < inputLines.length) {
          line += inputLines[i].padEnd(columnWidth) + "|";
        } else {
          line += "".padEnd(columnWidth) + "|";
        }
        if (i < outputLines.length) {
          line += outputLines[i].padEnd(columnWidth);
        } else {
          line += "".padEnd(columnWidth);
        }
        console.log(line);
      }
      console.log();
      return Veredict.AC;
    } else {
      console.log(`Test Case ${testId}:`, chalk.bgRed(chalk.whiteBright(" W A ")));
      console.log(chalk.whiteBright.bgGray("Input"));
      console.log(input);
      let outputLines = output.split("\n");
      let ansLines = ans.split("\n");
      let maxOutputWidth = 0;
      for (let i = 0; i < trimmedOutputLines.length; i++) {
        if (trimmedOutputLines[i].length > maxOutputWidth) {
          maxOutputWidth = trimmedOutputLines[i].length;
        }
      }
      let columnWidth = Math.min(Math.max(maxOutputWidth, 16), process.stdout.columns - 8);
      let leftHeader = chalk.whiteBright.bgGray(Util.padCenter("Your Output", columnWidth));
      let rightHeader = chalk.whiteBright.bgGray(Util.padCenter("Correct Answer", columnWidth));
      console.log(leftHeader + "|" + rightHeader);
      // console.log("".padEnd(columnWidth) + "|" + "".padEnd(columnWidth));
      for (let i = 0; i < Math.max(trimmedOutputLines.length, trimmedAnsLines.length); i++) {
        let line = "";
        if (i < trimmedOutputLines.length) {
          line += trimmedOutputLines[i].padEnd(columnWidth) + "|";
        } else {
          line += "".padEnd(columnWidth) + "|";
        }

        if (i < trimmedAnsLines.length) {
          line += trimmedAnsLines[i].padEnd(columnWidth);
        } else {
          line += "".padEnd(columnWidth);
        }

        if (
          i < trimmedOutputLines.length &&
          i < trimmedAnsLines.length &&
          trimmedOutputLines[i] === trimmedAnsLines[i]
        ) {
          line += chalk.bgGreen("  ");
        } else {
          line += chalk.bgRed("  ");
        }

        console.log(line);
      }
      console.log();
      return Veredict.WA;
    }
  }

  protected runDebug(execCommand: string, args: string[], testId: number): void {
    console.log("Running Test Case", testId, "with debugging flags\n");
    const execution = spawnSync(
      execCommand,
      [...args, "<", `"${Tester.getInputPath(this.filePath, testId)}"`],
      { shell: true }
    );

    if (execution.stdout.toString()) {
      console.log(execution.stdout.toString());
    }

    if (execution.stderr.toString()) {
      console.log(
        Util.replaceAll(execution.stderr.toString(), "runtime error", chalk.red("runtime error"))
      );
    }
  }

  protected runTest(execCommand: string, args: string[], testId: number): Veredict {
    process.stdout.write("Evaluating...");
    let execution = spawnSync(execCommand, args, {
      input: fs.readFileSync(Tester.getInputPath(this.filePath, testId)),
      timeout: this.extractTimeLimit() + 500
    });

    process.stdout.write("\r\x1b[K");
    if (execution.error?.message.includes("ETIMEDOUT")) {
      console.log(
        `Test Case ${testId}:`,
        chalk.bgHex("#8d42f5")(chalk.whiteBright(" T L E ")),
        "\n"
      );
      return Veredict.TLE;
    }

    if (execution.status !== 0) {
      console.log(`Test Case ${testId}:`, chalk.bgBlue(chalk.whiteBright(" R T E ")), "\n");
      if (execution.stdout.toString()) console.log(execution.stdout.toString());
      if (execution.stderr.toString()) console.log(execution.stderr.toString());
      return Veredict.RTE;
    }

    let outputPath = Tester.getOutputPath(this.filePath, testId);
    if (execution.stdout) {
      fs.writeFileSync(outputPath, execution.stdout.toString());
    }
    return this.printTestResults(testId);
  }

  protected runDebugWithUserInput(command: string, args: string[] = []): void {
    console.log("Running with debugging flags\n\nEnter your input manually\n");
    spawnSync(command, args, { stdio: "inherit" });
  }

  static getInputPath(filePath: string, testId: number): string {
    const filePathNoExtension = filePath.substring(0, filePath.lastIndexOf("."));
    return Util.normalizeFilePath(`${filePathNoExtension}.in${testId}`);
  }

  static getOutputPath(filePath: string, testId: number): string {
    const filePathNoExtension = filePath.substring(0, filePath.lastIndexOf("."));
    return Util.normalizeFilePath(`${filePathNoExtension}.out${testId}`);
  }

  static getAnswerPath(filePath: string, testId: number): string {
    const filePathNoExtension = filePath.substring(0, filePath.lastIndexOf("."));
    return Util.normalizeFilePath(`${filePathNoExtension}.ans${testId}`);
  }

  static getTestCasesIds(filePath: string): number[] {
    const parsedPath = Path.parse(filePath);
    let directoryPath = parsedPath.dir;
    if (directoryPath == "") directoryPath = ".";
    const fileNameNoExtension = parsedPath.name;
    const testcasesFiles = fs
      .readdirSync(directoryPath)
      .filter((fileName) => fileName.startsWith(`${fileNameNoExtension}.in`));
    const testcasesIds: number[] = [];
    testcasesFiles.forEach((filename) => {
      const num = parseInt(filename.replace(`${fileNameNoExtension}.in`, ""));
      testcasesIds.push(num);
    });
    return testcasesIds;
  }

  /**
   * @param {string} filePath path to the source code file
   * @returns the id with maximum numeric value from all the
   * test cases that correspond to `filePath`
   */
  static getMaxTestCaseId(filePath: string): number {
    const testCasesIds = Tester.getTestCasesIds(filePath);
    return testCasesIds.length === 0 ? 0 : Math.max(...testCasesIds);
  }

  /**
   * Computes the unique Id of a testcase that does not exist yet,
   * useful to know what will be the id of the next new testcase
   * before actually creating it.
   * @param {string} filePath path to the source code file
   * @returns the id of the next testcase
   */
  static getNextTestCaseId(filePath: string): number {
    return Tester.getMaxTestCaseId(filePath) + 1;
  }

  static async createTestCase(filePath: string): Promise<void> {
    const thisTCId = Tester.getNextTestCaseId(filePath);
    console.log("\nPress ctrl+D to finish your input\n");
    console.log("Test Case Input:\n");
    const input = await Util.readToEOF();
    console.log("\nTest Case Correct Output:\n");
    const answer = await Util.readToEOF();
    fs.writeFileSync(Tester.getInputPath(filePath, thisTCId), input);
    fs.writeFileSync(Tester.getAnswerPath(filePath, thisTCId), answer);
    console.log("\nTest case", thisTCId, "written.");
  }

  static printScore(ac: number, total: number): void {
    const plainmsg = `| ${ac.toString()} / ${total} AC |`;
    let msg = `| ${ac.toString()} / ${total} ${chalk.greenBright("AC")} |`;
    if (ac == total) msg += " 🎉🎉🎉";
    const summary = "Summary: ";
    console.log();
    console.log(Util.repeat(" ", summary.length) + Util.repeat("+", plainmsg.length));
    console.log(summary + msg);
    console.log(Util.repeat(" ", summary.length) + Util.repeat("+", plainmsg.length));
    console.log();
  }

  static printCompilationErrorMsg(): void {
    console.log(chalk.bgYellow(chalk.whiteBright(" Compilation Error ")), "\n");
  }

  static printUnnecesaryNoCompileFlagMsg(fileExtension: string): void {
    console.log(
      `${fileExtension} files will be interpreted not compiled, therefore, the --noCompile flag will be ignored.\n` +
        `If this was not the expected behavior verify the settings in your config file`
    );
  }

  protected getSegmentedCommand(langExtension: string, debug: boolean): string[] {
    const langConfig = this.config.languages[langExtension];

    if (langConfig) {
      let segmentedCommand: string[];
      if (debug) {
        segmentedCommand = langConfig.debugCommand.split(" ");
      } else {
        segmentedCommand = langConfig.command.split(" ");
      }
      // TODO: log message and exit(0) when segmentedCommand is empty
      return segmentedCommand;
    } else {
      console.log(
        `${
          debug ? "debug " : ""
        }command not specified in cpbooster-config.json for ${langExtension} files`
      );
      exit(0);
    }
  }

  protected getCompilerCommand(langExtension: string, debug: boolean): string {
    return this.getSegmentedCommand(langExtension, debug)[0];
  }
}
