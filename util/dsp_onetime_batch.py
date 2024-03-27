import argparse
import queue
import threading
import modal

stub = modal.Stub("dsp-onetime-batch")
q: "queue.Queue[str]" = queue.Queue()
dns_image = (modal.Image.debian_slim(python_version="3.10").pip_install("dnspython"))


def resolve_qname(qname: str):
	import dns.exception
	import dns.resolver
	import dns.rdatatype

	try:
		response = dns.resolver.resolve(qname, dns.rdatatype.TXT)
		if len(response) == 0:
			#print(f'warning: no records found for {qname}')
			return
		dkimData = ""
		for i in range(len(response)):
			dkimData += b''.join(response[i].strings).decode()  # type: ignore
		version = dkimData.split(';')[0].strip()
		if version != 'v=DKIM1':
			#print(f'warning: dkim version not supported: {version}')
			return
		for tag in dkimData.split(';'):
			if tag.strip() == "p=":
				# empty p= tag
				return
		print(f'found DKIM1 record for {qname}\n')
	except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.exception.Timeout) as e:
		#print(f'warning: dns resolver error: {e}')
		pass


def worker():
	while True:
		qname = q.get()
		resolve_qname(qname)
		q.task_done()


def process_domain(domain: str, selectors: list[str]) -> int:
	for _i in range(10):
		t = threading.Thread(target=worker, daemon=True)
		t.start()
	for selector in selectors:
		qname = f"{selector}._domainkey.{domain}"
		q.put(qname)
	q.join()
	return len(selectors)


@stub.function(image=dns_image)  # type: ignore
def process_domain_wrapper(domain: str, selectors: list[str]) -> int:
	return process_domain(domain, selectors)


def run_batch_job(domains_filename: str, selectors_filename: str, local: bool = False):
	with open(selectors_filename) as f:
		selectors = f.read().splitlines()
	with open(domains_filename) as f:
		domains = f.read().splitlines()
	for index, domain in enumerate(domains):
		print(f"processing domain {index}, {domain}")
		if local:
			process_domain(domain, selectors)
		else:
			process_domain_wrapper.spawn(domain, selectors)


# remote entrypoint
@stub.local_entrypoint()  # type: ignore
def main(domains_filename: str, selectors_filename: str):
	run_batch_job(domains_filename, selectors_filename)


# local entrypoint
if __name__ == "__main__":
	parser = argparse.ArgumentParser()
	parser.add_argument('--domains-filename', type=str)
	parser.add_argument('--selectors-filename', type=str)
	args = parser.parse_args()
	run_batch_job(args.domains_filename, args.selectors_filename, local=True)
