<p align="center">
    <img src="dataqa-ui/public/images/protractor.png?raw=true" width="150" height="150">
</p>

<h1 align="center">
    DataQA
</h1>

With DataQA, you can label unstructured text documents using rule-based distant supervision. You can use it to:
* manually label all documents,
* use a search engine to explore your data and label at the same time,
* label a sample of some documents with an imbalanced class distribution,
* create a baseline high-precision system for NER or for classification.

Documentation at: [https://dataqa.ai/docs/](https://dataqa.ai/docs/).

## Screenshots

Classify or extract named entities from your text:

<p align="center">
    <img src="github_images/labelling_entity_selected.png?raw=true" width="900"/>
</p>


Search and label your data:
<p align="center">
    <img src="github_images/search_label.png?raw=true" width="900"/>
</p>


Use rules & heuristics to automatically label your documents:
<p align="center">
    <img src="github_images/books_rule.png?raw=true" width="500"/>
</p>

# Installation

## Pre-requisites:

* Python 3.6, 3.7, 3.8 and 3.9
* (Recommended) start a new python virtual environment
* Update your pip `pip install -U pip`
* Tested on backend: MacOSX, Ubuntu. Tested on browser: Chrome.

## Installation

To install the package from pypi:

### Python versions 3.6, 3.7, 3.8

* `pip install dataqa`

### Python version 3.9

* `pip install dataqa --use-deprecated=legacy-resolver`

* This is due to an error in snorkel's dependencies, which uses a low version of the `networkx` package incompatible with python 3.9 ([issue in github](https://github.com/snorkel-team/snorkel/issues/1667)). The latest dependency resolver shipped with pip throws an error when a package has incompatible requirements (read more [here](https://pip.pypa.io/en/latest/user_guide/#changes-to-the-pip-dependency-resolver-in-20-3-2020)).

# Usage

## Start the application

In the terminal, type `dataqa run`. Wait a few minutes initially, as it takes some minutes to start everything up.

Doing this will run a server locally and open a browser window at port `5000`. If the application does not open the browser automatically, open `localhost:5000` in your browser. You need to keep the terminal open.

To quit the application, simply do `Ctr-C` in the terminal. To resume the application, type `dataqa run`. Doing so will create a folder at `$HOME/.dataqa_data`.

## Does this tool need an internet connection?

Only the first time you run it, it will need to download a language model from the internet. This is the only time it will need an internet connection. There is ongoing work to remove this constraint, so it can be run locally without any internet.

**No data will ever leave your local machine.**

## Uploading data

The text file needs to be a csv file in utf-8 encoding of up to 30MB with a column named "text" which contains the main text. The other columns will be ignored.

This step is running some analysis on your text and might take up to 5 minutes.


# Uninstall

In the terminal:

* `dataqa uninstall`: this deletes your local application data in the home directory in the folder `.dataqa_data`. It will prompt the user before deleting.
* `pip uninstall dataqa` 


# Troubleshooting

## Usage 

If the project data does not load, try to go to the homepage and `http://localhost:5000` and navigate to the project from there.

Try running `dataqa test` to get more information about the error, and bug reports are very welcome!

# Development

To test the application, it is possible to upload a text that contains a column "\_\_LABEL\_\_". The ground-truth labels will then be displayed during labelling and the real performance will be shown in the performance table between brackets.

# Packaging

## Using setuptools

To create the wheel file:

* Make sure there are no stale files: `rm -rf src/dataqa.egg-info; rm -rf build/;`
* `python setup.py sdist bdist_wheel`

# Contact

For any feedback, please contact us at contact@dataqa.ai.