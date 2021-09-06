# Welcome to the DataQA platform
<p align="center">
    <img src="dataqa-ui/public/images/protractor.png?raw=true" width="300" height="300">
</p>

With DataQA, you can label unstructured text documents using rule-based distant supervision. You can use it to:
* manually label all documents,
* label a sample of some documents with an imbalanced class distribution,
* create a baseline high-precision system for NER or for classification.

Documentation at: [https://dataqa.ai/docs/](https://dataqa.ai/docs/).

# Installation

### Pre-requisites:

* Python 3.6+
* (Recommended) start a new python virtual environment
* Update your pip `pip install -U pip`
* Tested on backend: MacOSX, Ubuntu. Tested on browser: Chrome.

### Installation

To install the package from pypi:

* `pip install dataqa`

# Usage

#### Start the application

In the terminal, type `dataqa run`. Wait a few minutes initially, as it takes some minutes to start everything up.

Doing this will run a server locally and open a browser window at port `5000`. If the application does not open the browser automatically, open `localhost:5000` in your browser. You need to keep the terminal open.

To quit the application, simply do `Ctr-C` in the terminal. To resume the application, type `dataqa run`. Doing so will create a folder at `$HOME/.dataqa_data`.

### Does this tool need an internet connection?

Only the first time you run it, it will need to download a language model from the internet. This is the only time it will need an internet connection. There is ongoing work to remove this constraint, so it can be run locally without any internet.

#### Uploading data

The text file needs to be a csv file in utf-8 encoding of up to 30MB with a column named "text" which contains the main text. The other columns will be ignored.

This step is running some analysis on your text and might take up to 5 minutes.


# Uninstall

In the terminal:

* `dataqa uninstall`: this deletes some application files in the home directory in the folder `.dataqa_data`. It will prompt the user before deleting.
* `pip uninstall dataqa` 


# Troubleshooting

If the project data does not load, try to go to the homepage and `http://localhost:5000` and navigate to the project from there.


# Development

To test the application, it is possible to upload a text that contains a column "\_\_LABEL\_\_". The ground-truth labels will then be displayed during labelling and the real performance will be shown in the performance table between brackets.

# Packaging

## Using setuptools

To create the wheel file:

* Make sure there are no stale files: `rm -rf src/dataqa.egg-info; rm -rf build/;`
* `python setup.py sdist bdist_wheel`

# Contact

For any feedback, please contact us at contact@dataqa.ai.