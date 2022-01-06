from pathlib import Path
import setuptools
from sys import platform
import os

PKG_DIR = os.path.dirname(os.path.abspath(__file__))

required = Path("requirements.txt").read_text().splitlines()

def package_files(directory):
    paths = []
    for (path, directories, filenames) in os.walk(directory):
        for filename in filenames:
            package_relative_path = Path(*Path(path).parts[2:], filename)
            paths.append(str(package_relative_path))
    return paths


if platform == "win32":
    raise Exception("Windows is not supported yet.")

extra_files = package_files(Path('', 'src/dataqa', 'tests', 'resources'))
extra_files.extend(package_files(Path('', 'src/dataqa', 'config')))

extra_files.extend(["api/static/bundle.js",
                    "api/static/protractor.png",
                    "api/templates/index.html"])

setuptools.setup(
    name="dataqa",
    version="1.1.7",
    author="DataQA.AI",
    author_email="contact@dataqa.ai",
    description="Package to search and label documents",
    python_requires='>=3.6',
    install_requires=required,
    package_dir={'': 'src'},
    packages=setuptools.find_packages(where='src'),
    package_data={"dataqa": extra_files},
    entry_points={'console_scripts': 'dataqa=dataqa.entry_points.run_app:main'},
    data_files=[('.', ["requirements.txt"])],
    classifiers=[
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9"
    ],
)
