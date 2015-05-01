import os
from setuptools import setup


# Utility function to read the README file.
def read(fname):
    return open(os.path.join(os.path.dirname(__file__), fname)).read()

# Setup, some thing to note
#   1. zip_safe needs to be False since we need access to templates/
setup(
    name="TimeVis",
    version="0.1",
    author="Ce Gao",
    author_email="gaoce@coe.neu.edu",
    description=("TimeVis: An interactive tool to query and visualize "
                 "time series gene expression data"),
    license="MIT",
    install_requires=[
        "Flask>=0.10.1",
    ],
    packages=['timevis'],
    package_dir={"timevis": "timevis"},
    package_data={
        "timevis": [
            "static/images/*",
            "static/js/*.js",
            "static/js/lib/*.js",
            "static/css/*.css",
            "static/css/lib/*.css",
            "static/css/lib/images/*",
            "templates/*.html",
        ]
    },
    long_description=read('README.md'),
    entry_points={'console_scripts': ['timevis = timevis.app:main']},
    zip_safe=False
)
