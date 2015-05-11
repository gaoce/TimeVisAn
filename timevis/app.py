#!/usr/bin/env python
from flask import Flask
import webbrowser

# app = Flask('timevis')
app = Flask('timevis')


def parse_args():
    args = {}
    args.browser = None

    return args


def main(port=8000):
    # Begin the server
    app.run(host='0.0.0.0', port=8000, debug=True)

    # Parse args
    args = parse_args()

    # Open a window
    if args.browser:
        webbrowser.open("http://localhost:{}/".format(port), new=2)

if __name__ == '__main__':
    main()