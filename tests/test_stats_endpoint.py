import importlib.util
import json
import pathlib
import unittest


MODULE_PATH = pathlib.Path(__file__).resolve().parents[1] / 'api' / 'stats.py'


class StatsEndpointTests(unittest.TestCase):
    def test_stats_endpoint_returns_payload(self):
        spec = importlib.util.spec_from_file_location('stats_module', MODULE_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        result = module.app({'method': 'GET'})

        self.assertEqual(result['statusCode'], 200)
        body = json.loads(result['body'])
        self.assertIn('totalMessages', body)
        self.assertIn('latestMessageAt', body)


if __name__ == '__main__':
    unittest.main()
