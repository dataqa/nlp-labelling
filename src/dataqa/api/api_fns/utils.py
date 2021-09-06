import io
import os


def get_column_names(file):
    first_line = file.readline()
    try:
        column_names = first_line.strip("\n").split(',')
    except:
        raise Exception("Need to load a csv file")
    file.seek(0)
    return column_names


def get_decoded_stream(file_bytes):
    file = io.TextIOWrapper(file_bytes, encoding='utf-8')
    return file


def check_file_size(file):
    if os.stat(file.fileno()).st_size == 0:
        raise Exception("File is empty")
    num = 0
    for _ in file.readline():
        num += 1
        if num >= 2:
            break
    if num < 2:
        raise Exception("File has 1 line only")
    file.seek(0)