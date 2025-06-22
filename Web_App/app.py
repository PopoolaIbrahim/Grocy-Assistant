from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# Global variables for bill (managed on server for persistence across requests)
current_bill_items = []
current_total_bill = 0

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/scan_barcode', methods=['POST'])
def scan_barcode():
    global current_bill_items, current_total_bill
    barcode_data = request.json.get('barcode')
    product_detail = {}
    item_added = False
    duplicate_scan = False # New flag

    if barcode_data:
        if barcode_data in items:
            item = items[barcode_data]
            # Check if this specific item (by name/barcode) is already in the current_bill_items
            # For simplicity, we'll just check if its barcode is present.
            # If you need to distinguish between multiple quantities of the same item,
            # you might need to store count along with the item in the bill.
            if any(b_item['name'] == item['name'] for b_item in current_bill_items):
                duplicate_scan = True
            
            current_bill_items.append(item) # Always add to bill for total calculation
            current_total_bill += item['price']
            product_detail = item
            item_added = True
            print(f"Added to bill: {item['name']}, Price: {item['price']}")
        else:
            print(f"Item Not Found for barcode: {barcode_data}")

    return jsonify({
        'barcode': barcode_data,
        'product': product_detail,
        'bill': current_bill_items,
        'total_bill': current_total_bill,
        'item_added': item_added,
        'duplicate_scan': duplicate_scan # Send this new flag
    })

@app.route('/reset_scan', methods=['POST'])
def reset_scan():
    global current_bill_items, current_total_bill
    current_bill_items = []
    current_total_bill = 0
    print("Scan reset successfully.")
    return jsonify(success=True)

@app.route('/get_current_bill', methods=['GET'])
def get_current_bill():
    return jsonify({
        'bill': current_bill_items,
        'total_bill': current_total_bill
    })

@app.route('/print_receipt', methods=['POST'])
def print_receipt():
    return jsonify(
        receipt_items=current_bill_items,
        total_bill=current_total_bill
    )

if __name__ == '__main__':
    app.run(debug=True)
    