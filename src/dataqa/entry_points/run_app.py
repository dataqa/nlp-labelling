import argparse
from dataqa.scripts import (start_app,
                            uninstall_app,
                            run_tests)
from dataqa.config.config_reader import read_config

def get_arg_parser():
    parser = argparse.ArgumentParser(prog='dataqa',
                                     description='Launch the DataQA application.')
    parser.add_argument('action', choices=['run', 'uninstall', 'test'], help='action')
    return parser


def main():
    parser = get_arg_parser()
    args = parser.parse_args()

    config = read_config()

    if args.action == 'run':
        start_app.main()
    elif args.action == 'test':
        run_tests.main()
    elif args.action == 'uninstall':
        uninstall_app.main(config)


if __name__ == "__main__":
    main()
