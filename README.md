<div align="center">
    <img src="dataqa-ui/public/images/protractor.png?raw=true" width="200" height="200"/>
    <h1 align="center">DataQA</h1>
</div>

<div align="center">
    <img src="https://img.shields.io/pypi/pyversions/dataqa"/>
    <img src="https://img.shields.io/github/license/dataqa/dataqa?color=success"/>
    <img src="https://img.shields.io/pypi/v/dataqa.svg?label=PyPI&logo=PyPI&logoColor=white&color=success"/>
    <img src="https://github.com/dataqa/dataqa/actions/workflows/github-actions.yml/badge.svg?&color=success"/>
</div>

&nbsp;

With DataQA, you can label unstructured text documents using rule-based distant supervision. Why rule-based labelling?
* you can label much faster by turning a multi-label problem into a binary labelling problem,
* you can get a high-performance NLP baseline with 50% less labelling,
* you can label documents that have an imbalanced class distribution by upsampling your minority classes,
* and much more!

Currently these are the main projects supported:
* multiclass classification,
* named entity recognition,
* named entity disambiguation.

In addition to this, DataQA ships with a search engine that you can use the explore and label your data at the same time.

#### Classify or extract named entities from your text

<div align="center">
    <img src="github_images/classification.gif" width="800" align="center"/>
    <p>&nbsp;</p>
    <img src="github_images/ner_labelling.gif" width="800" align="center"/>
</div>

#### Link entities to knowledge bases in large ontologies

<div align="center">
    <img src="github_images/ned.gif" width="800" align="center"/>
</div>

#### Search and label your data

<div align="center">
    <img src="github_images/search.gif" width="800" align="center"/>
</div>

#### Use rules & heuristics to automatically label your documents

<div align="center">
    <img src="github_images/rule_creation.gif" width="800" align="center"/>
    <p>&nbsp;</p>
    <img src="github_images/ner_rule.gif" width="800" align="center"/>
</div>

# Get started

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

### To run with Docker:

* `docker build . -t dataqa`
* `docker run -p 5000:5000 dataqa`

## Usage

In the terminal, type `dataqa run`. Wait a few minutes initially, as it takes some minutes to start everything up.

Doing this will run a server locally and open a browser window at port `5000`. If the application does not open the browser automatically, open `localhost:5000` in your browser. You need to keep the terminal open.

To quit the application, simply do `Ctr-C` in the terminal. To resume the application, type `dataqa run`. Doing so will create a folder at `$HOME/.dataqa_data`.

### Uploading data

The text file needs to be a csv file in utf-8 encoding of up to 30MB with a column named "text" which contains the main text. The other columns will be ignored.

This step is running some analysis on your text and might take up to 5 minutes.

# Documentation

Documentation at: [https://dataqa.ai/docs/](https://dataqa.ai/docs/).

* To get started with a multi-class classification problem, go [here](https://dataqa.ai/docs/tutorials/ecomm_product_categories/classification_product_categories/).
* To get started with a named entity recognition problem, go [here](https://dataqa.ai/docs/tutorials/medical_side_effects/ner_medical/).

# Uninstall

In the terminal:

* `dataqa uninstall`: this deletes your local application data in the home directory in the folder `.dataqa_data`. It will prompt the user before deleting.
* `pip uninstall dataqa` 

#### Does this tool need an internet connection?

Only the first time you run it, it will need to download a language model from the internet. This is the only time it will need an internet connection. There is ongoing work to remove this constraint, so it can be run locally without any internet.

**No data will ever leave your local machine.**



# Troubleshooting

If the project data does not load, try to go to the homepage and `http://localhost:5000` and navigate to the project from there.

Try running `dataqa test` to get more information about the error, and bug reports are very welcome!

To test the application, it is possible to upload a text that contains a column "\_\_LABEL\_\_". The ground-truth labels will then be displayed during labelling and the real performance will be shown in the performance table between brackets.


# Contact

For any feedback, please contact us at contact@dataqa.ai. Also follow me on [![alt text][1.1]][1] for more updates and content around ML and labelling.

[1.1]: https://i.imgur.com/wWzX9uB.png 
[1]: https://www.twitter.com/DataqaAi
