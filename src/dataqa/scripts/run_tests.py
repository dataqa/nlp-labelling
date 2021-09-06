from pathlib import Path
import sys

import pytest
from pytest import ExitCode

from dataqa.constants import ROOT_PATH

TESTS_FOLDER = str(Path(ROOT_PATH, "tests"))


def main():
    sys.dont_write_bytecode = 1
    exit_code = pytest.main([TESTS_FOLDER])
    if exit_code != ExitCode.OK:
        raise Exception("Tests did not pass.")
    sys.dont_write_bytecode = 0


if __name__ == "__main__":
    main()